import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { NgbDateStruct, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
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

@Component({
  selector: 'app-details-stage',
  templateUrl: './details-stage.component.html',
  styleUrls: ['./details-stage.component.scss'],
  providers: [DatePipe]
})
export class DetailsStageComponent implements OnInit, OnChanges {

  @Input() stage: number;
  @Input() team: number;
  @Output() loadErrorEvent = new EventEmitter<Error>();

  stageResult: StageResult;
  form: FormGroup;
  files: { [page: number]: any } = {};
  param: StageParam;
  fileParams: ResponseFileParam[];
  stageResponse: StageResponse;
  stageResponseNames: string[];

  constructor(
    private uploadFileService: UploadFileService,
    private formBuilder: FormBuilder,
    private stageService: StageService,
    private stageParamService: StageParamService,
    private datePipe: DatePipe,
    private confirmationDialogService: ConfirmationDialogService,
    private responseFileParamService: ResponseFileParamService) { }

  // convenience getters for easy access to form fields
  get f() { return this.form.controls; }
  get pages() { return this.f.pages as FormArray; }
  getResultForms(formGroup: FormGroup): FormArray { return formGroup.controls.results as FormArray; }
  getPerformanceForms(formGroup: FormGroup): FormArray { return formGroup.controls.performances as FormArray; }

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
    this.loadStage();
  }

  private clear() {
    console.log('clear');
    const ngbDate: NgbDateStruct = { year: 0, month: 0, day: 0 };
    const ngbTime: NgbTimeStruct = { hour: 0, minute: 0, second: 0 };
    this.form = this.formBuilder.group({
      pages: this.formBuilder.array([]),
      results: this.formBuilder.array([]),
      performances: this.formBuilder.array([]),
      checked: false,
      begindate: ngbDate,
      begintime: ngbTime,
      enddate: ngbDate,
      endtime: ngbTime,
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

  private async loadStageValues() {
    this.form.patchValue({
      checked: this.stageResult.checked,
      begindate: this.buildNgbDate(this.stageResult.begin),
      begintime: this.buildNgbTime(this.stageResult.begin),
      enddate: this.buildNgbDate(this.stageResult.end),
      endtime: this.buildNgbTime(this.stageResult.end),
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
        pageForm.controls.results as FormArray,
        pageForm.controls.performances as FormArray);
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
    results: FormArray,
    performances: FormArray) {
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

  buildNgbDate(date: Date): NgbDateStruct {
    return {
      year: Number(this.datePipe.transform(date, 'yyyy')),
      month: Number(this.datePipe.transform(date, 'MM')),
      day: Number(this.datePipe.transform(date, 'dd'))
    };
  }

  buildNgbTime(date: Date): NgbTimeStruct {
    return {
      hour: Number(this.datePipe.transform(date, 'HH')),
      minute: Number(this.datePipe.transform(date, 'mm')),
      second: Number(this.datePipe.transform(date, 'ss'))
    };
  }

  buildDate(date: NgbDateStruct, time: NgbTimeStruct): Date {
    // tslint:disable-next-line: triple-equals
    if (!date?.year || !date?.month || !date?.day || date?.year == 0 || date?.month == 0 || date?.day == 0)
      return null;
    if (!time?.hour)
      return null;
    return new Date(date?.year, date?.month - 1, date?.day, time?.hour, time?.minute, time?.second);
  }

  private findModifiedResults(form: FormGroup, modifiedResults: any[]) {
    form.getRawValue().results?.forEach((item: any) => {
      const result = this.stageResult.results.find(element => element.name === item.name);
      if (!result || item.resultValue !== result.resultValue) {
        modifiedResults.push(item);
      }
    });
  }

  private findModifiedperformances(form: FormGroup, modifiedperformances: any[]) {
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
        this.findModifiedResults(page as FormGroup, modifiedResults);
        this.findModifiedperformances(page as FormGroup, modifiedperformances);
      });
      const begin = this.buildDate(this.form.value.begindate, this.form.value.begintime);
      const sameBegin = (!begin && !this.stageResult.begin) || new Date(this.stageResult.begin).getTime() === begin?.getTime();
      const end = this.buildDate(this.form.value.enddate, this.form.value.endtime);
      const sameEnd = (!end && !this.stageResult.end) || new Date(this.stageResult.end).getTime() === end?.getTime();
      if (!sameBegin || !sameEnd ||
        modifiedResults.length !== 0 || modifiedperformances.length !== 0 ||
        this.form.value.checked !== this.stageResult.checked) {
        const stageResult = await this.stageService.updateStage({
          id: this.stageResult.id,
          team: this.stageResult.team,
          stage: this.stageResult.stage,
          checked: this.form.value.checked,
          begin: sameBegin ? undefined : begin,
          end: sameEnd ? undefined : end,
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
    this.ngOnInit();
  }

  async onCancelStage() {
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Annuler l\'étape',
        'Annuler la participation à l\'étape ' + this.stageResult.stage + ' ?',
        'Oui', 'Non');
      console.log('User confirmed:', confirmed);
      if (confirmed) {
        try {
          await this.modifyStage();
          await this.stageService.cancelStage(this.stageResult.stage, this.stageResult.team).toPromise();
        } catch (error) {
          console.log(error);
        }
        this.reload();
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
        'Annuler la fin de l\'étape',
        'Annuler la fin de l\'étape ' + this.stageResult.stage + ' ?',
        'Oui', 'Non');
      console.log('User confirmed:', confirmed);
      if (confirmed) {
        try {
          await this.modifyStage();
          await this.stageService.undoStage(this.stageResult.stage, this.stageResult.team).toPromise();
        } catch (error) {
          console.log(error);
        }
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
        'Démarrer l\'étape',
        'Démarrer l\'étape ' + this.stageResult.stage + ' ?',
        'Oui', 'Non');
      if (confirmed) {
        try {
          await this.modifyStage();
          await this.stageService.beginStage(this.stageResult.stage, this.stageResult.team).toPromise();
        } catch (error) {
          console.log(error);
        }
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
        'Finir l\'étape',
        'Finir l\'étape ' + this.stageResult.stage + ' ?',
        'Oui', 'Non');
      if (confirmed) {
        try {
          await this.modifyStage();
          await this.stageService.endStage(this.stageResult.stage, this.stageResult.team).toPromise();
        } catch (error) {
          console.log(error);
        }
        this.reload();
      }
    } catch (error) {
      console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      console.log(error);
      return;
    }
  }

  private hasEmptyPerformances(form: FormGroup): boolean {
    return form.getRawValue().performances?.find(item => !item.performanceValue) ?? false;
  }

  private hasEmptyResults(form: FormGroup): boolean {
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
    if (this.pages.controls.find(page => this.hasEmptyResults(page as FormGroup) || this.hasEmptyPerformances(page as FormGroup))) {
      return false;
    }
    return true;
  }
}
