import { DatePipe } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { HalLink } from 'src/app/models/hal-link';
import { QuestionDefinition } from 'src/app/configuration/models/question-definition';
import { QuestionType } from 'src/app/configuration/models/question-type';
import { ChallengeConfiguration } from 'src/app/configuration/models/challenge-configuration';
import { ChallengeConfigurationService } from 'src/app/configuration/challenge-configuration.service';
import { FormQuestionDefinition } from 'src/app/form-recognition/configuration/models/form-question-definition';
import { FormRecognitionConfiguration } from 'src/app/form-recognition/configuration/models/form-recognition-configuration';
import { FormRecognitionConfigurationService } from 'src/app/form-recognition/configuration/form-recognition-configuration.service';
import { SubmittedFormService } from 'src/app/form-processing/submitted-form.service';
import { isSubmittedFormSource } from '../models/submitted-form-source';
import { ChallengeResponse } from '../models/challenge-response';
import { isChallengeResponseSource, ChallengeResponseSource } from '../models/challenge-response-source';
import { ChallengeResult } from '../models/challenge-result';
import { ChallengeService } from '../challenge.service';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { NavigationMemoryService } from 'src/app/services/navigation-memory.service';
import { ChallengeResultUpdateService } from 'src/app/services/challenge-result-update.service';
import { RankingUpdateService } from 'src/app/services/ranking-update.service';
import { ApplicationUpdateService } from 'src/app/services/application-update.service';

@Component({
  selector: 'app-details-challenge',
  templateUrl: './details-challenge.component.html',
  styleUrls: ['./details-challenge.component.scss'],
  providers: [DatePipe]
})
export class DetailsChallengeComponent implements OnInit, OnChanges, OnDestroy {

  @Input() challenge!: number;
  @Input() team!: number;
  @Input() contentZoom = 1;
  @Output() loadErrorEvent = new EventEmitter<Error>();
  @Output() submittedFormsVisibilityChange = new EventEmitter<boolean>();

  challengeResult!: ChallengeResult;
  form!: UntypedFormGroup;
  files: { [page: number]: any } = {};
  challengeConfiguration!: ChallengeConfiguration;
  formRecognitionConfigurations: FormRecognitionConfiguration[] = [];
  challengeResponse?: ChallengeResponse;
  challengeResponseNames: string[] = [];
  mobileView = window.innerWidth < 768;
  private destroy$ = new Subject<void>();
  private zoomContentElement?: HTMLElement;
  private zoomViewportElement?: HTMLElement;
  private zoomResizeObserver?: ResizeObserver;
  private zoomFrame?: number;
  private resultLabelWidthCache = new Map<string, string>();
  private loadSequence = 0;
  private ownContentUpdatePending = false;
  private ownContentUpdateTimeout?: ReturnType<typeof setTimeout>;

  @ViewChild('zoomContent')
  set zoomContent(element: ElementRef<HTMLElement> | undefined) {
    this.zoomContentElement = element?.nativeElement;
    this.observeZoomContent();
  }

  @ViewChild('zoomViewport')
  set zoomViewport(element: ElementRef<HTMLElement> | undefined) {
    this.zoomViewportElement = element?.nativeElement;
    this.observeZoomContent();
  }

  constructor(
    private uploadFileService: SubmittedFormService,
    private formBuilder: UntypedFormBuilder,
    private challengeService: ChallengeService,
    private challengeConfigurationService: ChallengeConfigurationService,
    private datePipe: DatePipe,
    private confirmationDialogService: ConfirmationDialogService,
    private formRecognitionConfigurationService: FormRecognitionConfigurationService,
    private router: Router,
    private rankingUpdateService: RankingUpdateService,
    private challengeResultUpdateService: ChallengeResultUpdateService,
    private applicationUpdates: ApplicationUpdateService,
    private navigationMemoryService: NavigationMemoryService) { }

  get f() { return this.form.controls; }
  get pages() { return this.f.pages as UntypedFormArray; }
  get effectiveContentZoom() { return this.mobileView ? 1 : this.contentZoom; }
  getResultForms(formGroup: UntypedFormGroup): UntypedFormArray { return formGroup.controls.results as UntypedFormArray; }
  getPerformanceForms(formGroup: UntypedFormGroup): UntypedFormArray { return formGroup.controls.performances as UntypedFormArray; }
  getResultLabelWidth(results: UntypedFormArray): string {
    const labels = results.controls.map(result => String(result.get('name')?.value ?? '').trim());
    const cacheKey = labels.join('\u0000');
    const cachedWidth = this.resultLabelWidthCache.get(cacheKey);
    if (cachedWidth) {
      return cachedWidth;
    }
    const context = document.createElement('canvas').getContext('2d');
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const fontFamily = getComputedStyle(document.body).fontFamily || 'Arial, sans-serif';
    if (context) {
      context.font = `${rootFontSize * .72}px ${fontFamily}`;
    }
    const measuredWidth = labels.reduce((width, label) =>
      Math.max(width, context?.measureText(label).width ?? label.length * rootFontSize * .45), 0);
    const width = `${Math.max(32, Math.ceil(measuredWidth) + 1)}px`;
    this.resultLabelWidthCache.set(cacheKey, width);
    return width;
  }
  getPerformanceLabelWidth(performances: UntypedFormArray): string {
    return this.getResultLabelWidth(performances);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.mobileView = window.innerWidth < 768;
    this.emitSubmittedFormsVisibility();
    this.scheduleZoomViewportUpdate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('ngOnChanges');
    if (!(changes.challenge?.isFirstChange() ?? true) || !(changes.team?.isFirstChange() ?? true)) {
      console.log(changes);
      this.loadChallenge().then().catch(error => console.error(error));
    }
    if (changes.contentZoom) {
      this.scheduleZoomViewportUpdate();
    }
  }

  ngOnInit() {
    console.log('ngOnInit');
    this.clear();
    this.challengeResultUpdateService.updates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => {
        if (update.operation === 'RESYNC') {
          this.loadChallenge().catch(error => console.error(error));
          return;
        }
        if (Number(update.challenge) !== Number(this.challenge) || Number(update.team) !== Number(this.team)) return;
        if (update.operation === 'DELETE') {
          this.navigateToMemorizedOrProgression();
          return;
        }
        if (update.scope === 'CONTENT' && this.ownContentUpdatePending) {
          this.clearOwnContentUpdatePending();
          return;
        }
        if (update.scope === 'PROGRESSION') {
          this.checkChallengeStillExists();
          return;
        }
        this.loadChallenge().catch(error => console.error(error));
      });
    this.applicationUpdates.updates$.pipe(
      filter(update => update.domain === 'CONFIGURATION' || update.domain === 'DATABASE'),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadChallenge().catch(error => console.error(error)));
    this.loadChallenge();
  }

  ngOnDestroy(): void {
    this.zoomResizeObserver?.disconnect();
    if (this.zoomFrame !== undefined) {
      cancelAnimationFrame(this.zoomFrame);
    }
    this.clearOwnContentUpdatePending();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private observeZoomContent(): void {
    this.zoomResizeObserver?.disconnect();
    if (!this.zoomContentElement || !this.zoomViewportElement) {
      return;
    }
    this.zoomResizeObserver = new ResizeObserver(() => this.scheduleZoomViewportUpdate());
    this.zoomResizeObserver.observe(this.zoomContentElement);
    this.scheduleZoomViewportUpdate();
  }

  private scheduleZoomViewportUpdate(): void {
    if (this.zoomFrame !== undefined) {
      cancelAnimationFrame(this.zoomFrame);
    }
    this.zoomFrame = requestAnimationFrame(() => {
      this.zoomFrame = undefined;
      if (!this.zoomContentElement || !this.zoomViewportElement) {
        return;
      }
      const naturalHeight = Math.max(this.zoomContentElement.scrollHeight, this.zoomContentElement.offsetHeight);
      this.zoomViewportElement.style.height = `${naturalHeight * this.effectiveContentZoom}px`;
    });
  }

  private clear() {
    console.log('clear');
    this.form = this.formBuilder.group({
      pages: this.formBuilder.array([]),
      results: this.formBuilder.array([]),
      performances: this.formBuilder.array([]),
      checked: false,
      begindate: '',
      begintime: '',
      enddate: '',
      endtime: '',
    });
    this.formRecognitionConfigurations = [];
    this.challengeResponseNames = [];
    this.challengeResponse = undefined;
    this.files = {};
    this.submittedFormsVisibilityChange.emit(false);
  }

  private async loadChallenge() {
    console.log('loadChallenge');
    const loadSequence = ++this.loadSequence;
    this.clear();
    const configurationPromise = this.challengeConfigurationService.findByChallenge(this.challenge).toPromise();
    const challengePromise = this.challengeService.findChallenge(this.challenge, this.team).toPromise();
    try {
      const challengeResult = await challengePromise;
      if (!challengeResult) {
        throw new Error('L\'\u00e9preuve demand\u00e9e est introuvable.');
      }
      if (loadSequence !== this.loadSequence) return;
      this.challengeResult = challengeResult;
    } catch (error) {
      console.log(error);
      this.loadErrorEvent.emit(this.toError(error));
      return;
    }

    const loadChallengeValuesPromise = this.loadChallengeValues();
    const loadSubmittedFormsPromise = this.loadSubmittedForms(loadSequence);
    const loadChallengeResponsePromise = this.loadChallengeResponse(loadSequence);

    try {
      const configuration = await configurationPromise;
      if (!configuration) {
        throw new Error('Le param\u00e9trage de l\'\u00e9preuve est introuvable.');
      }
      if (loadSequence !== this.loadSequence) return;
      this.challengeConfiguration = configuration;
    } catch (error) {
      console.log(error);
      this.loadErrorEvent.emit(this.toError(error));
      return;
    }

    try {
      await this.loadFormRecognitionConfigurations(loadSequence);
      if (loadSequence !== this.loadSequence) return;
    } catch (error) {
      console.log(error);
      this.loadErrorEvent.emit(this.toError(error));
      return;
    }
    try {
      await loadChallengeResponsePromise;
      if (loadSequence !== this.loadSequence) return;
    } catch (error) {
      console.log(error);
    }

    this.loadQuestionPageResults();

    try {
      await loadSubmittedFormsPromise;
      if (loadSequence !== this.loadSequence) return;
      this.emitSubmittedFormsVisibility();
      await loadChallengeValuesPromise;
      this.updateFormDisabledState();
    } catch (error) {
      console.log(error);
    }
  }

  private async loadChallengeResponse(loadSequence: number) {
    const source = this.challengeResult?.responseSources?.filter(s => isChallengeResponseSource(s))
      .map(s => s as ChallengeResponseSource).shift();
    if (source?.pointUsed) {
      try {
        const challengeResponse = await this.challengeService.getChallengeResponse(source.id).toPromise();
        if (!challengeResponse) {
          return;
        }
        if (loadSequence !== this.loadSequence) return;
        const names = (challengeResponse.performances?.map(p => p.name) ?? [])
          .concat(challengeResponse.results?.map(p => p.name) ?? [])
          .concat(challengeResponse.questions?.map(p => p.name) ?? []);
        this.challengeResponse = challengeResponse;
        this.challengeResponseNames = names.filter((v, i, a) => a.indexOf(v) === i);
      } catch (error) {
        console.log(error);
      }
    }
  }

  public isReadOnly(name: string): boolean {
    return this.challengeResponseNames?.some(v => v === name) ?? false;
  }

  private checkChallengeStillExists() {
    this.challengeService.findChallenge(this.challenge, this.team).subscribe({
      next: (latest) => {
        if (latest) {
          this.challengeResult = { ...this.challengeResult, ...latest };
          if (this.form) {
            const beginControlsDirty = this.f.begindate.dirty || this.f.begintime.dirty;
            this.form.patchValue({
              begindate: beginControlsDirty ? this.form.getRawValue().begindate : this.formatDate(latest.begin),
              begintime: beginControlsDirty ? this.form.getRawValue().begintime : this.formatTime(latest.begin),
              enddate: this.formatDate(latest.end),
              endtime: this.formatTime(latest.end),
            }, { emitEvent: false });
            this.updateFormValues(latest);
            this.updateFormDisabledState();
          }
        }
      },
      error: () => {
        // Challenge supprimé ou annulé ailleurs -> revenir vers l'URL mémorisée ou accueil
        this.navigateToMemorizedOrProgression();
      }
    });
  }

  private updateFormValues(latest: ChallengeResult) {
    const updateResults = (array: UntypedFormArray) => {
      array.controls.forEach(control => {
        const name = control.get('name')?.value;
        const latestResult = latest.results?.find(r => r.name === name);
        if (latestResult) {
          control.get('resultValue')?.setValue(latestResult.resultValue, { emitEvent: false });
          control.get('init')?.setValue(latestResult.resultValue, { emitEvent: false });
          control.get('correctionMarks')?.setValue(latestResult.correctionMarks ?? null, { emitEvent: false });
          const fromSource = isChallengeResponseSource(latestResult.source) || isSubmittedFormSource(latestResult.source);
          control.get('light')?.setValue(fromSource, { emitEvent: false });
        }
      });
    };
    const updatePerformances = (array: UntypedFormArray) => {
      array.controls.forEach(control => {
        const name = control.get('name')?.value;
        const latestPerf = latest.performances?.find(p => p.name === name);
        if (latestPerf) {
          control.get('performanceValue')?.setValue(latestPerf.performanceValue, { emitEvent: false });
        }
      });
    };

    updateResults(this.getResultForms(this.form));
    updatePerformances(this.getPerformanceForms(this.form));
    this.pages.controls.forEach(page => {
      const pageGroup = page as UntypedFormGroup;
      updateResults(this.getResultForms(pageGroup));
      updatePerformances(this.getPerformanceForms(pageGroup));
    });
  }

  private updateFormDisabledState() {
    if (!this.form) {
      return;
    }
    if (this.challengeResult?.checked) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  private async loadChallengeValues() {
    this.form.patchValue({
      checked: this.challengeResult.checked,
      begindate: this.formatDate(this.challengeResult.begin),
      begintime: this.formatTime(this.challengeResult.begin),
      enddate: this.formatDate(this.challengeResult.end),
      endtime: this.formatTime(this.challengeResult.end),
    });
  }

  private async loadSubmittedForms(loadSequence: number) {
    const files: { [page: number]: any } = {};
    const submittedFormPromises = (this.challengeResult._links?.submittedForms as HalLink[] ?? [])
      .map(submittedForm => this.uploadFileService.getResource(submittedForm.href).toPromise());
    for (const submittedFormPromise of submittedFormPromises) {
      try {
        const submittedForm = await submittedFormPromise;
        if (submittedForm) {
          files[submittedForm.page] = submittedForm;
        }
      } catch (error) {
        console.log(error);
      }
    }
    if (loadSequence === this.loadSequence) {
      this.files = files;
    }
  }

  private emitSubmittedFormsVisibility(): void {
    this.submittedFormsVisibilityChange.emit(!this.mobileView && Object.keys(this.files).length > 0);
  }

  private async loadFormRecognitionConfigurations(loadSequence: number) {
    const formRecognitionConfigurations: FormRecognitionConfiguration[] = [];
    const formRecognitionConfigurationPromises = (this.challengeConfiguration._links?.formRecognitionConfigurations as HalLink[] ?? [])
      .map(formRecognitionConfiguration => this.formRecognitionConfigurationService.getFormRecognitionConfigurationByResource(formRecognitionConfiguration.href).toPromise());
    for (const formRecognitionConfigurationPromise of formRecognitionConfigurationPromises) {
      try {
        const formRecognitionConfiguration = await formRecognitionConfigurationPromise;
        if (formRecognitionConfiguration) {
          formRecognitionConfigurations.push(formRecognitionConfiguration);
        }
      } catch (error) {
        console.log(error);
      }
    }
    if (loadSequence === this.loadSequence) {
      this.formRecognitionConfigurations = formRecognitionConfigurations.sort((a, b) => a.page - b.page);
    }
  }

  private loadQuestionPageResults() {
    const questionDefinitions = Object.values(this.challengeConfiguration.questionDefinitions ?? {});
    for (const formRecognitionConfiguration of this.formRecognitionConfigurations) {
      const pageForm = this.formBuilder.group({
        page: formRecognitionConfiguration.page,
        results: this.formBuilder.array([]),
        performances: this.formBuilder.array([]),
      });
      this.makeQuestionResults(
        Object.values(formRecognitionConfiguration.questions),
        questionDefinitions,
        pageForm.controls.results as UntypedFormArray,
        pageForm.controls.performances as UntypedFormArray);
      this.pages.push(pageForm);
    }
    this.makeQuestionResults(
      questionDefinitions,
      [],
      this.getResultForms(this.form),
      this.getPerformanceForms(this.form));
  }

  private makeQuestionResults(
    formQuestionDefinitions: FormQuestionDefinition[],
    questionDefinitions: QuestionDefinition[],
    results: UntypedFormArray,
    performances: UntypedFormArray) {
    for (const formQuestionDefinition of formQuestionDefinitions) {
      const index = questionDefinitions.findIndex(q => q.name === formQuestionDefinition.name);
      if (index !== -1) {
        questionDefinitions.splice(index, 1);
      }
      if (formQuestionDefinition.type === QuestionType.QUESTION) {
        const result = this.challengeResult.results?.find(element => element.name === formQuestionDefinition.name);
        const fromSource = isChallengeResponseSource(result?.source ?? null) || isSubmittedFormSource(result?.source ?? null);
        results.push(this.formBuilder.group({
          name: formQuestionDefinition.name,
          resultValue: [{
            value: result?.resultValue,
            disabled: this.isReadOnly(formQuestionDefinition.name)
          }],
          init: result?.resultValue,
          light: fromSource,
          correctionMarks: [result?.correctionMarks ?? null]
        }));
      } else if (formQuestionDefinition.type === QuestionType.PERFORMANCE) {
        const performance = this.challengeResult.performances?.find(element => element.name === formQuestionDefinition.name);
        performances.push(this.formBuilder.group({
          name: formQuestionDefinition.name,
          performanceValue: [{
            value: performance ? performance.performanceValue : null,
            disabled: this.isReadOnly(formQuestionDefinition.name)
          }]
        }));
      }
    }
  }

  private formatDate(date?: Date): string {
    return date ? this.datePipe.transform(date, 'yyyy-MM-dd') ?? '' : '';
  }

  private formatTime(date?: Date): string {
    return date ? this.datePipe.transform(date, 'HH:mm:ss') ?? '' : '';
  }

  buildDate(date: string, time: string): Date | undefined {
    if (!date || !time) {
      return undefined;
    }
    const [year, month, day] = date.split('-').map(d => Number(d));
    if (!year || !month || !day) {
      return undefined;
    }
    const timeParts = time.split(':');
    if (timeParts.length < 2) {
      return undefined;
    }
    const [hour, minute, second = '0'] = timeParts;
    const h = Number(hour);
    const m = Number(minute);
    const s = Number(second);
    if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) {
      return undefined;
    }
    return new Date(year, month - 1, day, h, m, s);
  }

  private findModifiedResults(form: UntypedFormGroup, modifiedResults: any[]) {
    form.getRawValue().results?.forEach((item: any) => {
      const result = this.challengeResult.results?.find(element => element.name === item.name);
      const storedMarks = result?.correctionMarks ?? null;
      const currentMarks = item.correctionMarks ?? null;
      const marksChanged = JSON.stringify(storedMarks) !== JSON.stringify(currentMarks);
      if (!result || item.resultValue !== result.resultValue || marksChanged) {
        modifiedResults.push({
          name: item.name,
          resultValue: item.resultValue,
          correctionMarks: currentMarks
        });
      }
    });
  }

  private findModifiedperformances(form: UntypedFormGroup, modifiedperformances: any[]) {
    form.getRawValue().performances.forEach((item: any) => {
      const performance = this.challengeResult.performances?.find(element => element.name === item.name);
      if (!performance || item.performanceValue !== performance.performanceValue) {
        modifiedperformances.push(item);
      }
    });
  }

  onSubmit() {
    this.modifyChallenge().catch(error => {
      console.log(error);
    });
  }

  async modifyChallenge(): Promise<boolean> {
    try {
      console.log(this.form.value);
      const modifiedResults: Array<{ name: string; resultValue?: boolean }> = [];
      this.findModifiedResults(this.form, modifiedResults);
      const modifiedperformances: Array<{ name: string; performanceValue?: number }> = [];
      this.findModifiedperformances(this.form, modifiedperformances);
      this.pages.controls.forEach(page => {
        this.findModifiedResults(page as UntypedFormGroup, modifiedResults);
        this.findModifiedperformances(page as UntypedFormGroup, modifiedperformances);
      });
      const begin = this.buildDate(this.form.value.begindate, this.form.value.begintime);
      const end = this.buildDate(this.form.value.enddate, this.form.value.endtime);
      const hasChanges =
        modifiedResults.length !== 0 ||
        modifiedperformances.length !== 0 ||
        this.form.value.checked !== this.challengeResult.checked ||
        new Date(this.challengeResult.begin ?? '').getTime() !== (begin ? begin.getTime() : NaN) ||
        new Date(this.challengeResult.end ?? '').getTime() !== (end ? end.getTime() : NaN);

      if (hasChanges) {
        this.markOwnContentUpdatePending();
        const challengeResult = await this.challengeService.updateChallenge({
          id: this.challengeResult.id,
          team: this.challengeResult.team,
          challenge: this.challengeResult.challenge,
          checked: this.form.value.checked,
          begin: begin,
          end: end,
          results: modifiedResults.length !== 0 ? modifiedResults : undefined,
          performances: modifiedperformances.length !== 0 ? modifiedperformances : undefined
        }).toPromise();
        console.log(challengeResult);
        if (challengeResult) {
          this.challengeResult = { ...this.challengeResult, ...challengeResult };
          this.updateFormDisabledState();
        }
        return true;
      }
      return false;
    } catch (error) {
      this.clearOwnContentUpdatePending();
      console.log(error);
      throw error;
    }
  }

  private markOwnContentUpdatePending(): void {
    this.clearOwnContentUpdatePending();
    this.ownContentUpdatePending = true;
    // Le filet temporel évite qu'un événement externe ultérieur soit ignoré
    // si le serveur ne publie exceptionnellement pas l'événement de cette requête.
    this.ownContentUpdateTimeout = setTimeout(() => this.clearOwnContentUpdatePending(), 5000);
  }

  private clearOwnContentUpdatePending(): void {
    this.ownContentUpdatePending = false;
    if (this.ownContentUpdateTimeout !== undefined) {
      clearTimeout(this.ownContentUpdateTimeout);
      this.ownContentUpdateTimeout = undefined;
    }
  }

  reload() {
    // Rafraichissement sans reset de la page : on rejoue une synchro distante
    this.checkChallengeStillExists();
  }

  async onCancelChallenge() {
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Annulation d\'une challenge',
        'Annuler l\'challenge ' + this.challenge + ' de l\'equipe ' + this.team + '\u00A0?',
        'Oui', 'Non');
      console.log('User confirmed:', confirmed);
      if (confirmed) {
        try {
          await this.challengeService.cancelChallenge(this.challenge, this.team).toPromise();
        } catch (error) {
          console.log(error);
        }
        this.rankingUpdateService.triggerUpdate();
        await this.navigateToMemorizedOrProgression();
      }
    } catch (error) {
      console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      console.log(error);
      return;
    }
  }

  async onUndoChallenge() {
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Reprise d\'une challenge',
        'Reprendre l\'challenge ' + this.challenge + ' de l\'equipe ' + this.team + '\u00A0?',
        'Oui', 'Non');
      console.log('User confirmed:', confirmed);
      if (confirmed) {
        try {
          await this.challengeService.undoChallenge(this.challenge, this.team).toPromise();
        } catch (error) {
          console.log(error);
        }
        this.rankingUpdateService.triggerUpdate();
        this.reload();
      }
    } catch (error) {
      console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      console.log(error);
      return;
    }
  }

  async onStartChallenge() {
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Debut d\'une challenge',
        'Demarrer l\'challenge ' + this.challenge + ' de l\'equipe ' + this.team + '\u00A0?',
        'Oui', 'Non');
      if (confirmed) {
        try {
          await this.challengeService.beginChallenge(this.challenge, this.team).toPromise();
        } catch (error) {
          console.log(error);
        }
        this.rankingUpdateService.triggerUpdate();
        this.reload();
      }
    } catch (error) {
      console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      console.log(error);
      return;
    }
  }

  async onStopChallenge() {
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Fin d\'une challenge',
        'Terminer l\'challenge ' + this.challenge + ' de l\'equipe ' + this.team + '\u00A0?',
        'Oui', 'Non');
      if (confirmed) {
        try {
          await this.challengeService.endChallenge(this.challenge, this.team).toPromise();
        } catch (error) {
          console.log(error);
        }
        this.rankingUpdateService.triggerUpdate();
        this.reload();
      }
    } catch (error) {
      console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      console.log(error);
      return;
    }
  }

  private hasEmptyPerformances(form: UntypedFormGroup): boolean {
    return form.getRawValue().performances?.find((item: { performanceValue?: number }) =>
      !item.performanceValue && item.performanceValue !== 0) ?? false;
  }

  private async navigateToMemorizedOrProgression() {
    const last = this.navigationMemoryService.getLastMenuUrl();
    if (last) {
      try {
        await this.router.navigateByUrl(last);
        return;
      } catch (error) {
        console.log(error);
      }
    }
    await this.router.navigateByUrl('/');
  }

  private hasEmptyResults(form: UntypedFormGroup): boolean {
    return form.getRawValue().results?.find((item: { resultValue?: boolean }) =>
      item.resultValue !== true && item.resultValue !== false) ?? false;
  }

  private toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  get validable() {
    if (!this.buildDate(this.form.value.begindate, this.form.value.begintime)) {
      return false;
    }
    if (!this.buildDate(this.form.value.enddate, this.form.value.endtime)) {
      return false;
    }
    if (this.hasEmptyPerformances(this.form)) {
      return false;
    }
    if (this.hasEmptyResults(this.form)) {
      return false;
    }
    if (this.pages.controls.find(page => this.hasEmptyResults(page as UntypedFormGroup) || this.hasEmptyPerformances(page as UntypedFormGroup))) {
      return false;
    }
    return true;
  }
}




