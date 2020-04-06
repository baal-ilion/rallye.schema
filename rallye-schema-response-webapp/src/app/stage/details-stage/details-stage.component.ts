import { DatePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { NgbDateStruct, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { HalLink } from 'src/app/models/hal-link';
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

  @Input() stage: StageResult;

  form: FormGroup;
  files = [];
  param;

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
    this.param = null;
    this.files = [];
    if (this.stage._links && this.stage._links.responseFiles) {
      for (const responseFile of this.stage._links.responseFiles as HalLink[]) {
        this.uploadFileService.getResource(responseFile.href).subscribe(data => {
          this.files.push(data);
          this.files.sort((a, b) => (a.page > b.page) ? 1 : -1);
        }, err => {
          console.log(err);
        });
      }
    }
    this.form = this.formBuilder.group({
      results: this.formBuilder.array([]),
      performances: this.formBuilder.array([]),
      checked: this.stage.checked,
      begindate: this.buildNgbDate(this.stage.begin),
      begintime: this.buildNgbTime(this.stage.begin),
      enddate: this.buildNgbDate(this.stage.end),
      endtime: this.buildNgbTime(this.stage.end),
    });
    this.stageParamService.findByStage(this.stage.stage).toPromise().then(data => {
      this.param = data;

      for (const questionParamKey of Object.keys(this.param.questionParams)) {
        const questionParam = this.param.questionParams[questionParamKey];
        if (questionParam.type === 'QUESTION') {
          const result = this.stage.results.find(element => element.name === questionParam.name);
          this.results.push(this.formBuilder.group({
            name: questionParam.name,
            resultValue: result ? result.resultValue : null
          }));
        } else if (questionParam.type === 'PERFORMANCE') {
          const performance = this.stage.performances.find(element => element.name === questionParam.name);
          this.performances.push(this.formBuilder.group({
            name: questionParam.name,
            performanceValue: performance ? performance.performanceValue : null
          }));
        }
      }
    });
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
      const result = this.stage.results.find(element => element.name === item.name);
      if (!result || item.resultValue !== result.resultValue) {
        modifiedResults.push(item);
      }
    });
    const modifiedperformances = [];
    this.form.value.performances.forEach((item: any) => {
      const performance = this.stage.performances.find(element => element.name === item.name);
      if (!performance || item.performanceValue !== performance.performanceValue) {
        modifiedperformances.push(item);
      }
    });
    const begin = this.buildDate(this.form.value.begindate, this.form.value.begintime);
    const sameBegin = new Date(this.stage.begin).getTime() === begin.getTime();
    const end = this.buildDate(this.form.value.enddate, this.form.value.endtime);
    const sameEnd = new Date(this.stage.end).getTime() === end.getTime();
    if (!sameBegin || !sameEnd ||
      modifiedResults.length !== 0 || modifiedperformances.length !== 0 ||
      this.form.value.checked !== this.stage.checked) {
      this.stageService.updateStage({
        id: this.stage.id,
        team: this.stage.team,
        stage: this.stage.stage,
        checked: this.form.value.checked,
        begin: sameBegin ? undefined : begin,
        end: sameEnd ? undefined : end,
        results: modifiedResults.length !== 0 ? modifiedResults : undefined,
        performances: modifiedperformances.length !== 0 ? modifiedperformances : undefined
      });
    }
    this.reload();
  }

  reload() {
    this.stageService.getResource<StageResult>(this.stage._links.self.href).subscribe(data => {
      this.stage = data;
      this.ngOnInit();
    });
  }

  onCancelStage() {
    this.confirmationDialogService.confirm(
      'Annuler l\'étape',
      'Annuler la participation à l\'étape ' + this.stage.stage + ' ?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.stageService.cancelStage(this.stage.stage, this.stage.team).subscribe(() => {
            this.reload();
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  onUndoStage() {
    this.confirmationDialogService.confirm(
      'Annuler la fin de l\'étape',
      'Annuler la fin de l\'étape ' + this.stage.stage + ' ?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.stageService.undoStage(this.stage.stage, this.stage.team).subscribe(() => {
            this.reload();
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }
}
