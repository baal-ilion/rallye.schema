import { Component, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { HalLink } from 'src/app/models/hal-link';
import { ModifyResponseFileParamComponent } from 'src/app/response-file/param/modify-response-file-param/modify-response-file-param.component';
import { ResponseFileParam } from 'src/app/response-file/param/models/response-file-param';
import { ResponseFileParamService } from 'src/app/response-file/param/response-file-param.service';
import { AppDialogRef, DialogService } from 'src/app/shared/dialog/dialog.service';
import { StageGroupService } from 'src/app/services/stage-group.service';
import { ModifyPerformanceRangePointParamComponent } from '../modify-performance-range-point-param/modify-performance-range-point-param.component';
import { PerformanceRangePointParam } from '../models/performance-range-point-param';
import { PerformanceRangeType } from '../models/performance-range-type';
import { QuestionParam } from '../models/question-param';
import { QuestionPointParam } from '../models/question-point-param';
import { QuestionType } from '../models/question-type';
import { PerformancePointParams, QuestionParams, QuestionPointParams, StageParam } from '../models/stage-param';
import { StageGroup } from '../models/stage-group';
import { StageParamService } from '../stage-param.service';

type PerfPointAllocation = 'SCORE' | 'DATE' | 'RANK';
type PartialQuestionParam = { name: string; type?: QuestionType };

@Component({
  selector: 'app-modify-stage-param',
  templateUrl: './modify-stage-param.component.html',
  styleUrls: ['./modify-stage-param.component.scss']
})
export class ModifyStageParamComponent implements OnInit {
  stageParam!: StageParam;
  stageParams: StageParam[] = [];
  stageGroups: StageGroup[] = [];

  perfPointAllocationType: Record<PerformanceRangeType, PerfPointAllocation> = {
    VALUE: 'SCORE',
    BEGIN_UP_RANK: 'DATE',
    BEGIN_DOWN_RANK: 'DATE',
    END_UP_RANK: 'DATE',
    END_DOWN_RANK: 'DATE',
    PERF_UP_RANK: 'RANK',
    PERF_DOWN_RANK: 'RANK'
  };

  perfPointDefaultRangeType: Record<PerfPointAllocation, PerformanceRangeType> = {
    SCORE: PerformanceRangeType.VALUE,
    DATE: PerformanceRangeType.BEGIN_UP_RANK,
    RANK: PerformanceRangeType.PERF_UP_RANK,
  };

  stageParamForm!: UntypedFormGroup;
  responseFileParamUrls: string[] = [];
  removedQuestionParams: string[] = [];
  questionParamNames: string[] = [];
  questionParamName = '';
  questionParamError = '';
  showResponseFiles = false;
  showQuestions = false;
  showPoints = false;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private stageParamService: StageParamService,
    private route: ActivatedRoute,
    private confirmationDialogService: ConfirmationDialogService,
    private router: Router,
    private dialogService: DialogService,
    private responseFileParamService: ResponseFileParamService,
    private stageGroupService: StageGroupService
  ) { }

  // convenience getters for easy access to form fields
  get f() { return this.stageParamForm.controls; }
  get questionPointParams() { return this.f.questionPointParams as UntypedFormArray; }
  get performancePointParams() { return this.f.performancePointParams as UntypedFormArray; }
  get questionParams() { return this.f.questionParams as UntypedFormArray; }
  getRanges(performancePointParam: AbstractControl) {
    const f = (performancePointParam as UntypedFormGroup).controls;
    return f.ranges as UntypedFormArray;
  }

  ngOnInit() {
    this.questionParamName = '';
    this.questionParamError = '';
    this.removedQuestionParams = [];
    this.questionParamNames = [];
    this.responseFileParamUrls = [];

    // Formulaire réactif : on ajoute groupId
    this.stageParamForm = this.formBuilder.group({
      stage: [null, [Validators.required, Validators.min(1), this.uniqueStageValidator.bind(this)]],
      name: '',
      groupId: '', // id du groupe ou '' si aucun
      questionPointParams: this.formBuilder.array([]),
      performancePointParams: this.formBuilder.array([]),
      questionParams: this.formBuilder.array([])
    });

    // Charger les épreuves existantes pour la vérification d'unicité du numéro
    this.stageParamService.getStageParams().subscribe({
      next: response => {
        this.stageParams = response?._embedded?.stageParams ?? [];
        this.stageParamForm.controls.stage.updateValueAndValidity();
      },
      error: () => {
        this.stageParams = [];
      }
    });

    // Charger les groupes d'épreuves pour le <select>
    this.stageGroupService.getAll().subscribe({
      next: groups => this.stageGroups = groups,
      error: () => this.stageGroups = []
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigateByUrl('/listStageParam');
      return;
    }
    this.stageParamService.findById(id).subscribe(stageParam => {
      this.stageParam = stageParam;
      this.questionParamName = '';
      this.removedQuestionParams = [];
      this.questionParamNames = [];
      this.stageParamForm.controls.stage.setValue(this.stageParam.stage);
      this.stageParamForm.controls.name.setValue(this.stageParam.name);

      // Pré-remplir groupId avec le groupe existant (ou '')
      const currentGroupId = this.stageParam.group && this.stageParam.group.id ? this.stageParam.group.id : '';
      this.stageParamForm.controls.groupId.setValue(currentGroupId);
      this.stageParamForm.controls.stage.updateValueAndValidity();

      this.questionPointParams.clear();
      this.performancePointParams.clear();
      this.questionParams.clear();

      const questionKeys = Object.keys(this.stageParam.questionParams)
        .sort((left, right) => this.compareLabels(left, right));
      for (const questionKey of questionKeys) {
        const questionParam = this.stageParam.questionParams[questionKey];
        this.initQuestionPointParam(questionParam);
        this.initQuestionParam(questionParam);
      }
      if (this.stageParam._links && this.stageParam._links.responseFileParams) {
        for (const responseFileParamUrl of this.stageParam._links.responseFileParams as HalLink[]) {
          this.responseFileParamUrls.push(responseFileParamUrl.href);
        }
      }
    }, error => {
      this.questionParamName = '';
      this.removedQuestionParams = [];
      this.questionParamNames = [];
      this.responseFileParamUrls = [];
      this.stageParamForm.controls.stage.setValue('');
      this.stageParamForm.controls.name.setValue('');
      this.stageParamForm.controls.groupId.setValue('');
      this.questionPointParams.clear();
      this.performancePointParams.clear();
      this.questionParams.clear();
      console.log(error);
      this.router.navigateByUrl('/listStageParam');
    });
  }

  private initQuestionPointParam(questionParam: QuestionParam) {
    if (questionParam.type === QuestionType.QUESTION) {
      let pointValue = 0;
      const questionPoint = this.stageParam.questionPointParams[questionParam.name];
      if (questionPoint && questionPoint.point) {
        pointValue = questionPoint.point;
      }
      this.questionPointParams.push(this.formBuilder.group({
        name: questionParam.name,
        point: pointValue
      }));
    } else if (questionParam.type === QuestionType.PERFORMANCE) {
      const performancePoint = this.stageParam.performancePointParams[questionParam.name];
      const ranges = this.formBuilder.array([]);
      if (performancePoint?.ranges)
        performancePoint.ranges.forEach(range => ranges.push(this.buildFormGroup(range)));
      ranges.push(this.buildFormGroup({} as PerformanceRangePointParam));
      this.performancePointParams.push(this.formBuilder.group({
        name: questionParam.name,
        ranges
      }));
    }
  }

  private buildFormGroup(range: PerformanceRangePointParam): UntypedFormGroup {
    return this.formBuilder.group({
      allocationType: range.type ? this.perfPointAllocationType[range.type] : null,
      type: range.type,
      begin: range.begin,
      end: range.end,
      point: range.point,
      expression: range.expression
    });
  }

  private initQuestionParam(questionParam: QuestionParam) {
    if (questionParam.type === QuestionType.QUESTION || questionParam.type === QuestionType.PERFORMANCE) {
      this.questionParams.push(this.formBuilder.group({
        name: questionParam.name,
        type: questionParam.type
      }));
      this.questionParamNames.push(questionParam.name);
    }
  }

  addResponseFileParam() {
    const initialParam = {
      stage: this.stageParam.stage,
      page: 1,
      template: '',
      height: 0,
      width: 0,
      questions: {} as any
    } as ResponseFileParam;
    const modalRef: AppDialogRef<ModifyResponseFileParamComponent, FormData> = this.dialogService.open(ModifyResponseFileParamComponent, {
      data: {
        stageName: this.stageParam.name,
        param: initialParam
      }
    });
    modalRef.result.then((result) => {
      console.log(result);
      if (!result) { return; }
      this.responseFileParamService.createResponseFileParam(result as FormData).subscribe(() => {
        this.ngOnInit();
      }, err => {
        console.log(err);
        this.ngOnInit();
      });
    }).catch((error) => {
      console.log(error);
    });
  }

  addQuestionParam(paramName: string) {
    const name = (paramName || '').trim();
    this.questionParamError = '';
    if (!name) {
      this.questionParamError = 'Le label de la question est obligatoire.';
      return;
    }
    const existingName = this.questionParamNames.find(item =>
      this.compareLabels(item, name) === 0 && !this.removedQuestionParams.includes(item));
    if (existingName) {
      this.questionParamError = `La question « ${existingName} » existe déjà.`;
      return;
    }

    const question = this.formBuilder.group({ name, type: QuestionType.QUESTION });
    const questionInsertionIndex = this.questionParams.controls.findIndex(control =>
      this.compareLabels(name, control.value.name) < 0);
    this.questionParams.insert(
      questionInsertionIndex < 0 ? this.questionParams.length : questionInsertionIndex, question);

    const point = this.formBuilder.group({ name, point: 0 });
    const pointInsertionIndex = this.questionPointParams.controls.findIndex(control =>
      this.compareLabels(name, control.value.name) < 0);
    this.questionPointParams.insert(
      pointInsertionIndex < 0 ? this.questionPointParams.length : pointInsertionIndex, point);

    // Les questions et leurs barèmes sont affichés dans deux panneaux distincts,
    // mais constituent une seule donnée fonctionnelle. Force leur mise à jour
    // commune pour que le barème nouvellement créé soit immédiatement rendu.
    this.questionParams.updateValueAndValidity();
    this.questionPointParams.updateValueAndValidity();
    this.stageParamForm.updateValueAndValidity();

    if (!this.questionParamNames.includes(name)) {
      this.questionParamNames.push(name);
      this.questionParamNames.sort((left, right) => this.compareLabels(left, right));
    }
    const removedIndex = this.removedQuestionParams.indexOf(name);
    if (removedIndex >= 0) {
      this.removedQuestionParams.splice(removedIndex, 1);
    }
    this.questionParamName = '';
    this.showPoints = true;
    this.stageParamForm.markAsDirty();
  }

  removeQuestionParam(index: number) {
    const questionName = this.questionParams.at(index).value.name;
    if (this.questionParamNames.includes(questionName)) {
      const i = this.removedQuestionParams.indexOf(this.questionParams.at(index).value.name);
      if (i > -1) {
        this.removedQuestionParams.splice(i, 1);
      }
      this.removedQuestionParams.push(questionName);
    }
    this.questionParams.removeAt(index);
    const pointIndex = this.questionPointParams.controls.findIndex(control => control.value.name === questionName);
    if (pointIndex >= 0) {
      this.questionPointParams.removeAt(pointIndex);
    }
  }

  deleteStageParam() {
    const stageParamId = this.stageParam.id;
    if (!stageParamId) {
      return;
    }
    this.confirmationDialogService.confirm(
      'Suppresion d\'une épreuve',
      'Supprimer l\'épreuve ' + this.stageParam.stage + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.stageParamService.deleteStageParam(stageParamId).subscribe(() => {
            this.router.navigateByUrl('/listStageParam');
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  onDeleteResponseFileParam(event: unknown) {
    console.log('onDeleteResponseFileParam');
    console.log(event);
    this.ngOnInit();
  }

  onSubmit() {
    if (this.stageParamForm.invalid) {
      this.stageParamForm.markAllAsTouched();
      return;
    }

    const modifiedQuestionPointParams = this.getModifiedQuestionPointParams();
    const modifiedPerformancePointParams = this.getModifiedPerformancePointParams();
    const modifiedQuestionParams = this.getModifiedQuestionParams();
    const stageValue = Number(this.stageParamForm.value.stage);

    // 🔎 récupérer l'id du groupe choisi dans le formulaire
    const groupId: string = this.stageParamForm.value.groupId;
    const selectedGroup = groupId
      ? (this.stageGroups.find(g => g.id === groupId) || null)
      : null;

    this.stageParamService.updateStageParam({
      id: this.stageParam.id,
      stage: stageValue,
      name: this.stageParamForm.value.name,
      questionPointParams: modifiedQuestionPointParams,
      performancePointParams: modifiedPerformancePointParams,
      questionParams: modifiedQuestionParams,
      group: selectedGroup
    }).subscribe(data => {
      console.log(data);
      this.stageParam = data;
      this.ngOnInit();
    }, error => {
      console.log(error);
    });
  }

  private getModifiedQuestionPointParams(): QuestionPointParams {
    const modifiedQuestionPointParams: QuestionPointParams = {};
    this.stageParamForm.value.questionPointParams.forEach((item: QuestionPointParam) => {
      const questionPoint = this.stageParam.questionPointParams[item.name];
      if (!questionPoint || questionPoint.point !== item.point) {
        if (item.point === null || item.point === undefined || Number.isNaN(item.point)) {
          item.point = 0;
        }
        modifiedQuestionPointParams[item.name] = item;
      }
    });
    return modifiedQuestionPointParams;
  }

  private getModifiedPerformancePointParams(): PerformancePointParams {
    const modifiedPerformancePointParams: PerformancePointParams = {};
    this.stageParamForm.value.performancePointParams.forEach((item: any) => {
      const performancePoint = this.stageParam.performancePointParams[item.name];
      item.ranges.forEach((range: any, rangeIndex: number) => {
        if (performancePoint.ranges.length > rangeIndex) {
          const rangePoint = performancePoint.ranges[rangeIndex];
          if (rangePoint.type !== range.type ||
            rangePoint.begin !== range.begin ||
            rangePoint.end !== range.end ||
            rangePoint.point !== range.point ||
            rangePoint.expression !== range.expression) {
            modifiedPerformancePointParams[item.name] = item;
          }
        } else {
          if (((range.point && range.point !== 0) || range.expression) && range.type) {
            modifiedPerformancePointParams[item.name] = item;
          }
        }
      });
      item.ranges = item.ranges.filter((range: PerformanceRangePointParam) => (range.point || range.expression) && range.type);
    });
    return modifiedPerformancePointParams;
  }

  private getModifiedQuestionParams(): QuestionParams {
    const modifiedQuestionParams: QuestionParams = {};
    this.stageParamForm.value.questionParams.forEach((item: QuestionParam) => {
      const question = this.stageParam.questionParams[item.name];
      if (!question) {
        modifiedQuestionParams[item.name] = item;
      } else {
        if (item.type !== question.type) {
          const patch: PartialQuestionParam = { name: item.name };
          if (item.type !== question.type) {
            patch.type = item.type;
          }
          modifiedQuestionParams[item.name] = patch as QuestionParam;
        }
      }
    });
    this.removedQuestionParams.forEach((removed) => {
      const patch: PartialQuestionParam = { name: removed };
      modifiedQuestionParams[removed] = patch as QuestionParam;
    });
    return modifiedQuestionParams;
  }

  onPerfPointAllocationType(value: string, range: UntypedFormGroup) {
    const currentType = range.value.type as PerformanceRangeType | undefined;
    const currentAllocation = currentType ? this.perfPointAllocationType[currentType] : undefined;
    if (this.isPerfPointAllocation(value) && currentAllocation !== value) {
      range.patchValue({ type: this.perfPointDefaultRangeType[value] });
    }
  }

  onChangePerformanceRangePointParam(value: string, ranges: UntypedFormArray, index: number) {
    console.log('onChangePerformanceRangePointParam : ' + index);
    if (index === ranges.length - 1) {
      if (value) {
        ranges.push(this.buildFormGroup({} as PerformanceRangePointParam));
      }
    } else if (!value) {
      const range = ranges.at(index).value;
      if (!range.point && !range.expression) {
        ranges.removeAt(index);
      }
    }
  }

  onClickDetailPoint(range: UntypedFormGroup) {
    const modalRef: AppDialogRef<ModifyPerformanceRangePointParamComponent, PerformanceRangePointParam> = this.dialogService.open(ModifyPerformanceRangePointParamComponent, { size: 'xl' });
    modalRef.componentInstance.range = range.value as PerformanceRangePointParam;
    modalRef.result.then((result) => {
      if (!result) {
        return;
      }
      console.log(result);
      range.patchValue({ point: result.point, expression: result.expression });
    }).catch((error) => {
      console.log(error);
    });
  }

  private isPerfPointAllocation(value: string): value is PerfPointAllocation {
    return value === 'SCORE' || value === 'DATE' || value === 'RANK';
  }

  private compareLabels(left: string, right: string): number {
    return left.localeCompare(right, 'fr', {
      sensitivity: 'base',
      numeric: true
    });
  }

  private uniqueStageValidator(control: AbstractControl) {
    if (!control) { return null; }
    const stage = Number(control.value);
    if (!stage) { return null; }

    const currentId = this.stageParam?.id;
    const stagesInUse = this.stageParams
      .filter(param => param.id !== currentId)
      .map(param => param.stage);

    if (stagesInUse.includes(stage)) {
      return { uniqueStage: true };
    }
    return null;
  }
}
