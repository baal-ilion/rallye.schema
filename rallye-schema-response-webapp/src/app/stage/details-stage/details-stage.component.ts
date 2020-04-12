import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { NgbDateStruct, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { HalLink } from 'src/app/models/hal-link';
import { StageParam } from 'src/app/param/models/stage-param';
import { StageParamService } from 'src/app/param/stage-param.service';
import { UploadFileService } from 'src/app/upload/upload-file.service';
import { StageResult } from '../models/stage-result';
import { StageService } from '../stage.service';

@Component({
  selector: 'app-details-stage',
  templateUrl: './details-stage.component.html',
  styleUrls: ['./details-stage.component.scss'],
  providers: [DatePipe]
})
export class DetailsStageComponent implements OnInit {

  @Input() stage: number;
  @Input() team: number;
  @Output() loadErrorEvent = new EventEmitter<Error>();

  stageResult: StageResult;
  form: FormGroup;
  files = [];
  param: StageParam;

  constructor(
    private uploadFileService: UploadFileService,
    private formBuilder: FormBuilder,
    private stageService: StageService,
    private stageParamService: StageParamService,
    private datePipe: DatePipe,
    private confirmationDialogService: ConfirmationDialogService) { }

  // convenience getters for easy access to form fields
  get f() { return this.form.controls; }
  get results() { return this.f.results as FormArray; }
  get performances() { return this.f.performances as FormArray; }

  ngOnInit() {
    const ngbDate: NgbDateStruct = { year: 0, month: 0, day: 0 };
    const ngbTime: NgbTimeStruct = { hour: 0, minute: 0, second: 0 };
    this.form = this.formBuilder.group({
      results: this.formBuilder.array([]),
      performances: this.formBuilder.array([]),
      checked: false,
      begindate: ngbDate,
      begintime: ngbTime,
      enddate: ngbDate,
      endtime: ngbTime,
    });
    this.param = null;
    this.stageResult = null;
    this.files = [];

    this.loadStage();
  }

  private async loadStage() {
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

    try {
      this.param = await paramPromise;
    } catch (error) {
      console.log(error);
      this.loadErrorEvent.emit(error);
      return;
    }
    this.loadQuestionResults();
    try {
      await loadResponceFilesPromise;
      await loadStageValuesPromise;
    } catch (error) {
      console.log(error);
    }
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
        this.files.push(responseFile);
      } catch (error) {
        console.log(error);
      }
    }
    this.files.sort((a, b) => (a.page > b.page) ? 1 : -1);
  }

  private loadQuestionResults() {
    for (const questionParamKey of Object.keys(this.param.questionParams)) {
      const questionParam = this.param.questionParams[questionParamKey];
      if (questionParam.type === 'QUESTION') {
        const result = this.stageResult.results.find(element => element.name === questionParam.name);
        this.results.push(this.formBuilder.group({
          name: questionParam.name,
          resultValue: result ? result.resultValue : null
        }));
      } else if (questionParam.type === 'PERFORMANCE') {
        const performance = this.stageResult.performances.find(element => element.name === questionParam.name);
        this.performances.push(this.formBuilder.group({
          name: questionParam.name,
          performanceValue: performance ? performance.performanceValue : null
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
    return new Date(date?.year, date?.month - 1, date?.day, time?.hour, time?.minute, time?.second);
  }

  onSubmit() {
    const modifiedResults = [];
    this.form.value.results.forEach((item: any) => {
      const result = this.stageResult.results.find(element => element.name === item.name);
      if (!result || item.resultValue !== result.resultValue) {
        modifiedResults.push(item);
      }
    });
    const modifiedperformances = [];
    this.form.value.performances.forEach((item: any) => {
      const performance = this.stageResult.performances.find(element => element.name === item.name);
      if (!performance || item.performanceValue !== performance.performanceValue) {
        modifiedperformances.push(item);
      }
    });
    const begin = this.buildDate(this.form.value.begindate, this.form.value.begintime);
    const sameBegin = new Date(this.stageResult.begin).getTime() === begin.getTime();
    const end = this.buildDate(this.form.value.enddate, this.form.value.endtime);
    const sameEnd = new Date(this.stageResult.end).getTime() === end.getTime();
    if (!sameBegin || !sameEnd ||
      modifiedResults.length !== 0 || modifiedperformances.length !== 0 ||
      this.form.value.checked !== this.stageResult.checked) {
      this.stageService.updateStage({
        id: this.stageResult.id,
        team: this.stageResult.team,
        stage: this.stageResult.stage,
        checked: this.form.value.checked,
        begin: sameBegin ? undefined : begin,
        end: sameEnd ? undefined : end,
        results: modifiedResults.length !== 0 ? modifiedResults : undefined,
        performances: modifiedperformances.length !== 0 ? modifiedperformances : undefined
      }).toPromise().then(stageResult => {
        console.log(stageResult);
        this.reload();
      }, error => {
        console.log(error);
        this.reload();
      });
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

}
