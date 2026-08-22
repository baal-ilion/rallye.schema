import { Component, OnInit, OnChanges, OnDestroy, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { UntypedFormArray } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Corners } from 'src/app/response-file/common/details-template/models/corners';
import { FormTemplate } from 'src/app/response-file/common/details-template/models/form-template';
import { Point } from 'src/app/response-file/common/details-template/models/point';

@Component({
  selector: 'app-details-response-file',
  templateUrl: './details-response-file.component.html',
  styleUrls: ['./details-response-file.component.scss']
})
export class DetailsResponseFileComponent implements OnInit, OnChanges, OnDestroy {
  @Input() fileUpload: any;
  @Input() dragable = true;
  @Input() correctionForm?: UntypedFormArray;
  @Input() correctionDisabled = false;
  @Output() endDragEvent = new EventEmitter<Corners>();

  template: FormTemplate;
  private correctionSubscription?: Subscription;
  private changingFromOverlay = false;
  constructor() { }

  ngOnInit() {
    this.loadTemplate(this.fileUpload);
  }

  ngOnChanges(changes: SimpleChanges): void {
    for (const propName in changes) {
      if (propName === 'fileUpload') {
        console.log(propName);
        const change = changes[propName];
        this.loadTemplate(change.currentValue);
      } else if (propName === 'correctionForm') {
        this.bindCorrectionForm();
        if (this.fileUpload) {
          this.loadTemplate(this.fileUpload);
        }
      } else if (propName === 'correctionDisabled') {
        this.refreshCorrectionStates();
      } else {
        console.log(propName);
      }
    }
  }

  ngOnDestroy(): void {
    this.correctionSubscription?.unsubscribe();
  }

  loadTemplate(fileUpload) {
    this.template = new FormTemplate();
    // Les coordonnées des repères sont calculées sur l'image traitée complète.
    // La miniature reste réservée à la liste : l'utiliser ici peut afficher une
    // version redimensionnée ou périmée qui ne correspond plus aux coordonnées.
    const href = fileUpload?._links?.responseFile?.href || fileUpload?._links?.responseFileThumbnail?.href;
    if (href) {
      // Force un src relatif via le proxy /api pour éviter le mixed-content et rester https
      let path = href;
      try {
        const url = new URL(href, window.location.origin);
        path = `${url.pathname}${url.search}`;
      } catch {
        // href peut déjà être relatif ; on le garde
      }
      this.template.fileUrl = `/api${path}`;
    }
    this.template.square = fileUpload.filledForm.size;
    this.template.height = fileUpload.filledForm.height;
    this.template.width = fileUpload.filledForm.width;
    if (fileUpload.filledForm.parentTemplate) {
      this.template.initialHeight = fileUpload.filledForm.parentTemplate.height;
      this.template.initialWidth = fileUpload.filledForm.parentTemplate.width;
    }
    this.template.corners = fileUpload.filledForm.corners;

    const groups = fileUpload.filledForm.groups ?? {};
    const parentGroups = fileUpload.filledForm.parentTemplate?.groups ?? {};
    const projection = this.buildProjection(fileUpload.filledForm.parentTemplate, fileUpload.filledForm);
    const groupKeys = Object.keys(groups).sort();
    for (const group of groupKeys) {
      const fields = groups[group].fields ?? {};
      const fieldKeys = Object.keys(fields).sort();
      for (const field of fieldKeys) {
        const points = fields[field].points ?? {};
        const expectedPoints = parentGroups[group]?.fields?.[field]?.points ?? {};
        const control = this.findCorrectionControl(field);
        const detectedKeys = Object.keys(points).filter(key => !!points[key]);
        const expectedKeys = Object.keys(expectedPoints);
        const pointKeys = control
          ? ['O', 'N', 'Y'].filter(key => expectedKeys.includes(key) || detectedKeys.includes(key))
          : detectedKeys;
        const detectedValue = this.getResultValue(detectedKeys);
        const controlValue = control?.get('resultValue')?.value;
        const resultValue = control ? (controlValue == null ? detectedValue : controlValue) : detectedValue;
        const storedMarks: string[] | null = control?.get('correctionMarks')?.value ?? null;

        for (const pointValue of pointKeys) {
          const detectedPoint = points[pointValue];
          const expectedPoint = expectedPoints[pointValue];
          const displayedPoint = detectedPoint || (expectedPoint && projection ? projection(expectedPoint) : expectedPoint);
          if (!displayedPoint) {
            continue;
          }
          const interactive = !!control && !control.disabled && !this.correctionDisabled && ['O', 'N', 'Y'].includes(pointValue);
          const decision = pointValue === 'N' ? 'fausse' : 'juste';
          this.template.points.push({
            point: displayedPoint,
            valid: control ? resultValue : null,
            comment: interactive
              ? `${field} · ${pointValue} : cliquer pour marquer la réponse ${decision}`
              : `${field} : ${resultValue === true ? 'Ok' : resultValue === false ? 'Ko' : pointValue}`,
            field,
            value: pointValue,
            selected: storedMarks ? storedMarks.includes(pointValue) : !!detectedPoint,
            initialSelected: !!detectedPoint,
            interactive,
            manual: false
          });
        }
      }
    }
    this.bindCorrectionForm();
  }

  selectCorrection(event: { field: string, value: string }): void {
    const control = this.findCorrectionControl(event.field);
    if (!control || control.disabled || this.correctionDisabled) {
      return;
    }
    const selectedPoint = this.template.points.find(point => point.field === event.field && point.value === event.value);
    if (!selectedPoint) {
      return;
    }
    const fieldPoints = this.template.points.filter(point => point.field === event.field);
    const isCurrentlySelected = !!selectedPoint.selected;
    const correctionOrder = ['O', 'N', 'Y'];
    const selectedIndex = correctionOrder.indexOf(event.value);
    if (selectedIndex === -1) {
      return;
    }
    const hasEarlierSelection = fieldPoints.some(point => {
      const pointIndex = correctionOrder.indexOf(point.value ?? '');
      return point.selected && pointIndex >= 0 && pointIndex < selectedIndex;
    });
    for (const point of fieldPoints) {
      const pointIndex = correctionOrder.indexOf(point.value ?? '');
      if (pointIndex === -1) {
        continue;
      }
      if (isCurrentlySelected) {
        if (pointIndex < selectedIndex) {
          point.selected = false;
        } else if (pointIndex === selectedIndex && !hasEarlierSelection) {
          point.selected = false;
        }
      } else {
        point.selected = pointIndex >= selectedIndex;
      }
    }
    const selectedValues = fieldPoints
      .filter(point => point.selected && point.value)
      .map(point => point.value as string);
    const resultControl = control.get('resultValue');
    const selectionChanged = fieldPoints.some(point => point.selected !== point.initialSelected);
    const marksControl = control.get('correctionMarks');
    this.changingFromOverlay = true;
    try {
      resultControl?.setValue(this.getResultValue(selectedValues));
      marksControl?.setValue(selectionChanged ? selectedValues : null);
    } finally {
      this.changingFromOverlay = false;
    }
    resultControl?.markAsDirty();
    marksControl?.markAsDirty();
    this.refreshCorrectionStates();
  }

  private bindCorrectionForm(): void {
    this.correctionSubscription?.unsubscribe();
    if (!this.correctionForm) {
      return;
    }
    this.correctionSubscription = this.correctionForm.valueChanges.subscribe(() => {
      if (!this.changingFromOverlay) {
        this.synchronizeMarksWithExternalResults();
      }
      this.refreshCorrectionStates();
    });
    this.refreshCorrectionStates();
  }

  private synchronizeMarksWithExternalResults(): void {
    for (const control of this.correctionForm?.controls ?? []) {
      const field = control.get('name')?.value;
      const currentValue = control.get('resultValue')?.value === true;
      const initialValue = this.getInitialResultValue(field);
      if (!field) {
        continue;
      }
      const fieldPoints = (this.template?.points ?? [])
        .filter(point => point.field === field && point.initialSelected !== undefined);
      if (currentValue === initialValue) {
        for (const point of fieldPoints) {
          point.selected = point.initialSelected;
        }
      } else {
        const selectedValues = new Set(fieldPoints.filter(point => point.selected).map(point => point.value));
        if (currentValue) {
          const isCorrectionAfterNo = selectedValues.has('N');
          for (const point of fieldPoints) {
            point.selected = isCorrectionAfterNo
              ? ['O', 'N', 'Y'].includes(point.value ?? '')
              : point.value === 'Y';
          }
        } else {
          const isCorrectionAfterYes = selectedValues.has('Y');
          for (const point of fieldPoints) {
            point.selected = isCorrectionAfterYes
              ? ['N', 'Y'].includes(point.value ?? '')
              : false;
          }
        }
      }
      const marksControl = control.get('correctionMarks');
      const selectionChanged = fieldPoints.some(point => point.selected !== point.initialSelected);
      const selectedMarks = fieldPoints
        .filter(point => point.selected && point.value)
        .map(point => point.value as string);
      const correctionMarks = selectionChanged ? selectedMarks : null;
      if (JSON.stringify(marksControl?.value ?? null) !== JSON.stringify(correctionMarks)) {
        marksControl?.setValue(correctionMarks, { emitEvent: false });
        marksControl?.markAsDirty();
      }
    }
  }

  private refreshCorrectionStates(): void {
    if (!this.template) {
      return;
    }
    for (const point of this.template.points) {
      if (!point.field) {
        continue;
      }
      const control = this.findCorrectionControl(point.field);
      if (control) {
        const controlValue = control.get('resultValue')?.value;
        const selectedValues = this.template.points
          .filter(candidate => candidate.field === point.field && candidate.selected && candidate.value)
          .map(candidate => candidate.value as string);
        point.valid = controlValue == null ? this.getResultValue(selectedValues) : controlValue;
        point.interactive = !control.disabled && !this.correctionDisabled;
        const forced = this.isCorrectionForced(control, point.field);
        point.manual = forced;
        control.get('light')?.setValue(!forced, { emitEvent: false });
      }
    }
  }

  private findCorrectionControl(field: string): any {
    return this.correctionForm?.controls.find(control => control.get('name')?.value === field);
  }

  private isCorrectionForced(control: any, field: string): boolean {
    const resultControl = control?.get('resultValue');
    const selectionChanged = this.template?.points
      .filter(point => point.field === field && point.initialSelected !== undefined)
      .some(point => point.selected !== point.initialSelected) ?? false;
    const currentValue = resultControl?.value === true;
    const initialValue = this.getInitialResultValue(field);
    return selectionChanged || currentValue !== initialValue;
  }

  private getInitialResultValue(field: string): boolean {
    const initialValues = (this.template?.points ?? [])
      .filter(point => point.field === field && point.initialSelected && point.value)
      .map(point => point.value as string);
    return this.getResultValue(initialValues);
  }

  private getResultValue(pointKeys: string[]): boolean {
    if (pointKeys.includes('O')) {
      return true;
    }
    if (pointKeys.includes('N')) {
      return false;
    }
    if (pointKeys.includes('Y')) {
      return true;
    }
    return false;
  }

  private buildProjection(parentTemplate: any, filledForm: any): ((point: Point) => Point) | null {
    const cornerNames = ['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_RIGHT', 'BOTTOM_LEFT'];
    const source = cornerNames.map(name => parentTemplate?.corners?.[name]);
    const target = cornerNames.map(name => filledForm?.corners?.[name]);
    if (source.some(point => !point) || target.some(point => !point)) {
      return null;
    }

    const matrix: number[][] = [];
    const values: number[] = [];
    for (let index = 0; index < 4; index++) {
      const x = source[index].x;
      const y = source[index].y;
      const u = target[index].x;
      const v = target[index].y;
      matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
      values.push(u);
      matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
      values.push(v);
    }
    const coefficients = this.solveLinearSystem(matrix, values);
    if (!coefficients) {
      return null;
    }
    return (point: Point): Point => {
      const denominator = coefficients[6] * point.x + coefficients[7] * point.y + 1;
      return {
        x: (coefficients[0] * point.x + coefficients[1] * point.y + coefficients[2]) / denominator,
        y: (coefficients[3] * point.x + coefficients[4] * point.y + coefficients[5]) / denominator
      };
    };
  }

  private solveLinearSystem(matrix: number[][], values: number[]): number[] | null {
    const size = values.length;
    const augmented = matrix.map((row, index) => [...row, values[index]]);
    for (let column = 0; column < size; column++) {
      let pivot = column;
      for (let row = column + 1; row < size; row++) {
        if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
          pivot = row;
        }
      }
      if (Math.abs(augmented[pivot][column]) < 1e-9) {
        return null;
      }
      [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
      const divisor = augmented[column][column];
      for (let index = column; index <= size; index++) {
        augmented[column][index] /= divisor;
      }
      for (let row = 0; row < size; row++) {
        if (row === column) {
          continue;
        }
        const factor = augmented[row][column];
        for (let index = column; index <= size; index++) {
          augmented[row][index] -= factor * augmented[column][index];
        }
      }
    }
    return augmented.map(row => row[size]);
  }

  endDrag(event: Corners) {
    this.endDragEvent.emit(event);
  }
}
