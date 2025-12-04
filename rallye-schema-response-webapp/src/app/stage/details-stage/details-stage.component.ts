import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { HalLink } from 'src/app/models/hal-link';
import { QuestionParam } from 'src/app/param/models/question-param';
import { QuestionType } from 'src/app/param/models/question-type';
import { StageParam } from 'src/app/param/models/stage-param';
import { StageParamService } from 'src/app/param/stage-param.service';
import { QuestionPageParam } from 'src/app/response-file/param/models/question-page-param';
import { ResponseFileParam } from 'src/app/response-file/param/models/response-file-param';
import { ResponseFileParamService } from 'src/app/response-file/param/response-file-param.service';
import { UploadFileService } from 'src/app/upload/upload-file.service';
import { isResponseFileSource } from '../models/response-file-source';
import { StageResponse } from '../models/stage-response';
import { isStageResponseSource, StageResponseSource } from '../models/stage-response-source';
import { StageResult } from '../models/stage-result';
import { StageService } from '../stage.service';
import { RankingUpdateService } from 'src/app/services/ranking-update.service';
import { TeamInfoService } from 'src/app/param/team-info.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-details-stage',
  templateUrl: './details-stage.component.html',
  styleUrls: ['./details-stage.component.scss'],
  providers: [DatePipe]
})
export class DetailsStageComponent implements OnInit, OnChanges, OnDestroy {

  @Input() stage: number;
  @Input() team: number;
  @Output() loadErrorEvent = new EventEmitter<Error>();

  stageResult: StageResult;
  form: UntypedFormGroup;
  files: { [page: number]: any } = {};
  param: StageParam;
  fileParams: ResponseFileParam[];
  stageResponse: StageResponse;
  stageResponseNames: string[];
  private destroy$ = new Subject<void>();

  constructor(
    private uploadFileService: UploadFileService,
    private formBuilder: UntypedFormBuilder,
    private stageService: StageService,
    private stageParamService: StageParamService,
    private datePipe: DatePipe,
    private confirmationDialogService: ConfirmationDialogService,
    private responseFileParamService: ResponseFileParamService,
    private router: Router,
    private rankingUpdateService: RankingUpdateService,
    private teamInfoService: TeamInfoService) { }

  get f() { return this.form.controls; }
  get pages() { return this.f.pages as UntypedFormArray; }
  getResultForms(formGroup: UntypedFormGroup): UntypedFormArray { return formGroup.controls.results as UntypedFormArray; }
  getPerformanceForms(formGroup: UntypedFormGroup): UntypedFormArray { return formGroup.controls.performances as UntypedFormArray; }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('ngOnChanges');
    if (!(changes.stage?.isFirstChange() ?? true) || !(changes.team?.isFirstChange() ?? true)) {
      console.log(changes);
      this.loadStage().then().catch(error => console.error(error));
    }
  }

  ngOnInit() {
    console.log('ngOnInit');
    this.clear();
    this.rankingUpdateService.updates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.checkStageStillExists());
    this.loadStage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.param = null;
    this.fileParams = null;
    this.stageResponseNames = [];
    this.stageResult = null;
    this.stageResponse = null;
    this.files = {};
  }

  private async loadStage() {
    console.log('loadStage');
    this.clear();
    const paramPromise = this.stageParamService.findByStage(this.stage).toPromise();
    const stagePromise = this.stageService.findStage(this.stage, this.team).toPromise();
    try {
      this.stageResult = await stagePromise;
    } catch (error) {
      console.log(error);
      this.loadErrorEvent.emit(error);
      return;
    }

    const loadStageValuesPromise = this.loadStageValues();
    const loadResponceFilesPromise = this.loadResponseFiles();
    const loadStageResponsePromise = this.loadStageResponse();

    try {
      this.param = await paramPromise;
    } catch (error) {
      console.log(error);
      this.loadErrorEvent.emit(error);
      return;
    }

    try {
      await this.loadResponseFileParams();
    } catch (error) {
      console.log(error);
      this.loadErrorEvent.emit(error);
      return;
    }
    try {
      await loadStageResponsePromise;
    } catch (error) {
      console.log(error);
    }

    this.loadQuestionPageResults();

    try {
      await loadResponceFilesPromise;
      await loadStageValuesPromise;
      this.updateFormDisabledState();
    } catch (error) {
      console.log(error);
    }
  }

  private async loadStageResponse() {
    const source = this.stageResult?.responseSources?.filter(s => isStageResponseSource(s))
      .map(s => s as StageResponseSource).shift();
    if (source?.pointUsed) {
      try {
        this.stageResponse = await this.stageService.getStageResponse(source.id).toPromise();
        this.stageResponseNames = this.stageResponse?.performances?.map(p => p.name) ?? [];
        this.stageResponseNames = this.stageResponseNames.concat(this.stageResponse?.results?.map(p => p.name) ?? []);
        this.stageResponseNames = this.stageResponseNames.concat(this.stageResponse?.questions?.map(p => p.name) ?? []);
        this.stageResponseNames = this.stageResponseNames.filter((v, i, a) => a.indexOf(v) === i);
      } catch (error) {
        console.log(error);
      }
    }
  }

  public isReadOnly(name: string): boolean {
    return this.stageResponseNames?.some(v => v === name) ?? false;
  }

  private checkStageStillExists() {
    this.stageService.findStage(this.stage, this.team).subscribe({
      next: (latest) => {
        if (latest) {
          this.stageResult = { ...this.stageResult, ...latest };
          if (this.form) {
            this.form.patchValue({
              begindate: this.formatDate(latest.begin),
              begintime: this.formatTime(latest.begin),
              enddate: this.formatDate(latest.end),
              endtime: this.formatTime(latest.end),
            }, { emitEvent: false });
            this.updateFormValues(latest);
            this.updateFormDisabledState();
          }
        }
      },
      error: () => {
        // Stage supprime (ex: annule ailleurs) -> revenir a la progression de l'equipe
        this.navigateToTeamProgression();
      }
    });
  }

  private updateFormValues(latest: StageResult) {
    const updateResults = (array: UntypedFormArray) => {
      array.controls.forEach(control => {
        const name = control.get('name')?.value;
        const latestResult = latest.results?.find(r => r.name === name);
        if (latestResult) {
          control.get('resultValue')?.setValue(latestResult.resultValue, { emitEvent: false });
          control.get('init')?.setValue(latestResult.resultValue, { emitEvent: false });
          const fromSource = isStageResponseSource(latestResult.source) || isResponseFileSource(latestResult.source);
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
    if (this.stageResult?.checked) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  private async loadStageValues() {
    this.form.patchValue({
      checked: this.stageResult.checked,
      begindate: this.formatDate(this.stageResult.begin),
      begintime: this.formatTime(this.stageResult.begin),
      enddate: this.formatDate(this.stageResult.end),
      endtime: this.formatTime(this.stageResult.end),
    });
  }

  private async loadResponseFiles() {
    const responseFilePromises = (this.stageResult._links?.responseFiles as HalLink[] ?? [])
      .map(responseFile => this.uploadFileService.getResource(responseFile.href).toPromise());
    for (const responseFilePromise of responseFilePromises) {
      try {
        const responseFile = await responseFilePromise;
        this.files[responseFile.page] = responseFile;
      } catch (error) {
        console.log(error);
      }
    }
  }

  private async loadResponseFileParams() {
    const fileParams: ResponseFileParam[] = [];
    const responseFileParamPromises = (this.param._links?.responseFileParams as HalLink[] ?? [])
      .map(responseFileParam => this.responseFileParamService.getResponseFileParamByResource(responseFileParam.href).toPromise());
    for (const responseFileParamPromise of responseFileParamPromises) {
      try {
        const responseFileParam = await responseFileParamPromise;
        fileParams.push(responseFileParam);
      } catch (error) {
        console.log(error);
      }
    }
    this.fileParams = fileParams.sort((a, b) => a.page - b.page);
  }

  private loadQuestionPageResults() {
    const questionParams = Object.values(this.param.questionParams);
    for (const fileParam of this.fileParams) {
      const pageForm = this.formBuilder.group({
        page: fileParam.page,
        results: this.formBuilder.array([]),
        performances: this.formBuilder.array([]),
      });
      this.makeQuestionResults(
        Object.values(fileParam.questions),
        questionParams,
        pageForm.controls.results as UntypedFormArray,
        pageForm.controls.performances as UntypedFormArray);
      this.pages.push(pageForm);
    }
    this.makeQuestionResults(
      questionParams,
      [],
      this.getResultForms(this.form),
      this.getPerformanceForms(this.form));
  }

  private makeQuestionResults(
    questionPageParams: QuestionPageParam[],
    questionParams: QuestionParam[],
    results: UntypedFormArray,
    performances: UntypedFormArray) {
    for (const questionPageParam of questionPageParams) {
      const index = questionParams.findIndex(q => q.name === questionPageParam.name);
      if (index !== -1) {
        questionParams.splice(index, 1);
      }
      if (questionPageParam.type === QuestionType.QUESTION) {
        const result = this.stageResult.results.find(element => element.name === questionPageParam.name);
        const fromSource = isStageResponseSource(result?.source) || isResponseFileSource(result?.source);
        results.push(this.formBuilder.group({
          name: questionPageParam.name,
          resultValue: [{
            value: result?.resultValue,
            disabled: this.isReadOnly(questionPageParam.name)
          }],
          init: result?.resultValue,
          light: fromSource
        }));
      } else if (questionPageParam.type === QuestionType.PERFORMANCE) {
        const performance = this.stageResult.performances.find(element => element.name === questionPageParam.name);
        performances.push(this.formBuilder.group({
          name: questionPageParam.name,
          performanceValue: [{
            value: performance ? performance.performanceValue : null,
            disabled: this.isReadOnly(questionPageParam.name)
          }]
        }));
      }
    }
  }

  private formatDate(date: Date): string {
    return date ? this.datePipe.transform(date, 'yyyy-MM-dd') : '';
  }

  private formatTime(date: Date): string {
    return date ? this.datePipe.transform(date, 'HH:mm:ss') : '';
  }

  buildDate(date: string, time: string): Date {
    if (!date || !time) {
      return null;
    }
    const [year, month, day] = date.split('-').map(d => Number(d));
    if (!year || !month || !day) {
      return null;
    }
    const timeParts = time.split(':');
    if (timeParts.length < 2) {
      return null;
    }
    const [hour, minute, second = '0'] = timeParts;
    const h = Number(hour);
    const m = Number(minute);
    const s = Number(second);
    if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) {
      return null;
    }
    return new Date(year, month - 1, day, h, m, s);
  }

  private findModifiedResults(form: UntypedFormGroup, modifiedResults: any[]) {
    form.getRawValue().results?.forEach((item: any) => {
      const result = this.stageResult.results.find(element => element.name === item.name);
      if (!result || item.resultValue !== result.resultValue) {
        modifiedResults.push(item);
      }
    });
  }

  private findModifiedperformances(form: UntypedFormGroup, modifiedperformances: any[]) {
    form.getRawValue().performances.forEach((item: any) => {
      const performance = this.stageResult.performances.find(element => element.name === item.name);
      if (!performance || item.performanceValue !== performance.performanceValue) {
        modifiedperformances.push(item);
      }
    });
  }

  onSubmit() {
    this.modifyStage().then(modified => {
      if (modified)
        this.reload();
    }, error => {
      console.log(error);
      this.reload();
    });
  }

  async modifyStage(): Promise<boolean> {
    try {
      console.log(this.form.value);
      const modifiedResults = [];
      this.findModifiedResults(this.form, modifiedResults);
      const modifiedperformances = [];
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
        this.form.value.checked !== this.stageResult.checked ||
        new Date(this.stageResult.begin ?? '').getTime() !== (begin ? begin.getTime() : NaN) ||
        new Date(this.stageResult.end ?? '').getTime() !== (end ? end.getTime() : NaN);

      if (hasChanges) {
        const stageResult = await this.stageService.updateStage({
          id: this.stageResult.id,
          team: this.stageResult.team,
          stage: this.stageResult.stage,
          checked: this.form.value.checked,
          begin: begin,
          end: end,
          results: modifiedResults.length !== 0 ? modifiedResults : undefined,
          performances: modifiedperformances.length !== 0 ? modifiedperformances : undefined
        }).toPromise();
        console.log(stageResult);
        return true;
      }
      return false;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  reload() {
    // Rafraichissement sans reset de la page : on rejoue une synchro distante
    this.checkStageStillExists();
  }

  async onCancelStage() {
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Annulation d\'une epreuve',
        'Annuler l\'epreuve ' + this.stage + ' de l\'equipe ' + this.team + '\u00A0?',
        'Oui', 'Non');
      console.log('User confirmed:', confirmed);
      if (confirmed) {
        try {
          await this.stageService.cancelStage(this.stage, this.team).toPromise();
        } catch (error) {
          console.log(error);
        }
        this.rankingUpdateService.triggerUpdate();
        await this.navigateToTeamProgression();
      }
    } catch (error) {
      console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      console.log(error);
      return;
    }
  }

  async onUndoStage() {
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Reprise d\'une epreuve',
        'Reprendre l\'epreuve ' + this.stage + ' de l\'equipe ' + this.team + '\u00A0?',
        'Oui', 'Non');
      console.log('User confirmed:', confirmed);
      if (confirmed) {
        try {
          await this.stageService.undoStage(this.stage, this.team).toPromise();
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

  async onStartStage() {
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Debut d\'une epreuve',
        'Demarrer l\'epreuve ' + this.stage + ' de l\'equipe ' + this.team + '\u00A0?',
        'Oui', 'Non');
      if (confirmed) {
        try {
          await this.stageService.beginStage(this.stage, this.team).toPromise();
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

  async onStopStage() {
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Fin d\'une epreuve',
        'Terminer l\'epreuve ' + this.stage + ' de l\'equipe ' + this.team + '\u00A0?',
        'Oui', 'Non');
      if (confirmed) {
        try {
          await this.stageService.endStage(this.stage, this.team).toPromise();
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
    return form.getRawValue().performances?.find(item => !item.performanceValue && item.performanceValue !== 0) ?? false;
  }

  private async navigateToTeamProgression() {
    try {
      const teamInfo = await this.teamInfoService.findByTeam(this.team).toPromise();
      if (teamInfo?.id) {
        await this.router.navigateByUrl('/team/' + teamInfo.id);
        return;
      }
    } catch (error) {
      console.log(error);
    }
    await this.router.navigateByUrl('/');
  }

  private hasEmptyResults(form: UntypedFormGroup): boolean {
    return form.getRawValue().results?.find(item => item.resultValue !== true && item.resultValue !== false) ?? false;
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




