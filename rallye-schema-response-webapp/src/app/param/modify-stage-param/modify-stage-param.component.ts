import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { HalLink } from 'src/app/models/hal-link';
import { ModifyResponseFileParamComponent } from 'src/app/response-file/param/modify-response-file-param/modify-response-file-param.component';
import { ResponseFileParamService } from 'src/app/response-file/param/response-file-param.service';
import { QuestionParam } from '../models/question-param';
import { StageParam } from '../models/stage-param';
import { StageParamService } from '../stage-param.service';

@Component({
  selector: 'app-modify-stage-param',
  templateUrl: './modify-stage-param.component.html',
  styleUrls: ['./modify-stage-param.component.scss']
})
export class ModifyStageParamComponent implements OnInit {
  stageParam: StageParam;

  stageParamForm: FormGroup;
  responseFileParamUrls: string[] = [];
  removedQuestionParams: string[] = [];
  questionParamNames: string[] = [];
  questionParamName = '';
  constructor(
    private formBuilder: FormBuilder,
    private stageParamService: StageParamService,
    private route: ActivatedRoute,
    private confirmationDialogService: ConfirmationDialogService,
    private router: Router,
    private modalService: NgbModal,
    private responseFileParamService: ResponseFileParamService
  ) { }
  // convenience getters for easy access to form fields
  get f() { return this.stageParamForm.controls; }
  get questionPointParams() { return this.f.questionPointParams as FormArray; }
  get performancePointParams() { return this.f.performancePointParams as FormArray; }
  get questionParams() { return this.f.questionParams as FormArray; }
  getRanges(performancePointParam: AbstractControl) {
    const f = (performancePointParam as FormGroup).controls;
    return f.ranges as FormArray;
  }

  ngOnInit() {
    this.stageParam = null;
    this.questionParamName = '';
    this.removedQuestionParams = [];
    this.questionParamNames = [];
    this.responseFileParamUrls = [];
    this.stageParamForm = this.formBuilder.group({
      name: '',
      inactive: false,
      questionPointParams: this.formBuilder.array([]),
      performancePointParams: this.formBuilder.array([]),
      questionParams: this.formBuilder.array([])
    });
    const id = this.route.snapshot.paramMap.get('id');
    this.stageParamService.findById(id).subscribe(stageParam => {
      this.stageParam = stageParam;
      this.questionParamName = '';
      this.removedQuestionParams = [];
      this.questionParamNames = [];
      this.stageParamForm.controls.name.setValue(this.stageParam.name);
      this.stageParamForm.controls.inactive.setValue(this.stageParam.inactive);
      this.questionPointParams.clear();
      this.performancePointParams.clear();
      this.questionParams.clear();

      const questionKeys = Object.keys(this.stageParam.questionParams);
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
      this.stageParam = null;
      this.questionParamName = '';
      this.removedQuestionParams = [];
      this.questionParamNames = [];
      this.responseFileParamUrls = [];
      this.stageParamForm.controls.name.setValue('');
      this.stageParamForm.controls.inactive.setValue(false);
      this.questionPointParams.clear();
      this.performancePointParams.clear();
      this.questionParams.clear();
      console.log(error);
      this.router.navigateByUrl('/listStageParam');
    });
  }

  private initQuestionPointParam(questionParam: QuestionParam) {
    if (questionParam.type === 'QUESTION') {
      let pointValue = 0;
      const questionPoint = this.stageParam.questionPointParams[questionParam.name];
      if (questionPoint && questionPoint.point) {
        pointValue = questionPoint.point;
      }
      this.questionPointParams.push(this.formBuilder.group({
        name: questionParam.name,
        point: pointValue
      }));
    } else if (questionParam.type === 'PERFORMANCE') {
      const performancePoint = this.stageParam.performancePointParams[questionParam.name];
      const ranges = this.formBuilder.array([]);
      performancePoint?.ranges?.forEach(range => {
        const type: string = range.type;
        const begin: number = range.begin;
        const end: number = range.end;
        const point: number = range.point;
        ranges.push(this.formBuilder.group({
          type,
          begin,
          end,
          point
        }));
      });
      ranges.push(this.formBuilder.group({
        type: null,
        begin: null,
        end: null,
        point: null
      }));
      this.performancePointParams.push(this.formBuilder.group({
        name: questionParam.name,
        ranges
      }));
    }
  }

  private initQuestionParam(questionParam: QuestionParam) {
    if (questionParam.type === 'QUESTION' || questionParam.type === 'PERFORMANCE') {
      this.questionParams.push(this.formBuilder.group({
        name: questionParam.name,
        type: questionParam.type,
        staff: questionParam.staff
      }));
      this.questionParamNames.push(questionParam.name);
    }
  }

  addResponseFileParam() {
    const modalRef = this.modalService.open(ModifyResponseFileParamComponent);
    modalRef.componentInstance.param = {
      stage: this.stageParam.stage,
      page: 1,
      template: ''
    };
    modalRef.result.then((result) => {
      console.log(result);
      this.responseFileParamService.createResponseFileParam(result).subscribe(data => {
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
    if (!this.questionParamNames.includes(paramName) || this.removedQuestionParams.includes(paramName)) {
      this.questionParams.push(this.formBuilder.group({
        name: paramName,
        type: 'QUESTION',
        staff: false
      }));
      const index = this.removedQuestionParams.indexOf(paramName, 0);
      if (index > -1) {
        this.removedQuestionParams.splice(index, 1);
      }
    }
    this.questionParamName = '';
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
  }

  deleteStageParam() {
    this.confirmationDialogService.confirm(
      'Suppresion de l\'étape',
      'Supprimer l\'étape ' + this.stageParam.stage + ' ?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.stageParamService.deleteStageParam(this.stageParam.id).subscribe(() => {
            this.router.navigateByUrl('/listStageParam');
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  onDeleteResponseFileParam(event) {
    console.log('onDeleteResponseFileParam');
    console.log(event);
    this.ngOnInit();
  }

  onSubmit() {
    const modifiedQuestionPointParams = this.getModifiedQuestionPointParams();
    const modifiedPerformancePointParams = this.getModifiedPerformancePointParams();
    const modifiedQuestionParams = this.getModifiedQuestionParams();
    this.stageParamService.updateStageParam({
      id: this.stageParam.id,
      stage: this.stageParam.stage,
      name: this.stageParamForm.value.name,
      inactive: this.stageParamForm.value.inactive,
      questionPointParams: modifiedQuestionPointParams,
      performancePointParams: modifiedPerformancePointParams,
      questionParams: modifiedQuestionParams
    }).subscribe(data => {
      console.log(data);
      this.stageParam = data;
      this.ngOnInit();
    }, error => {
      console.log(error);
    });
  }

  private getModifiedQuestionPointParams() {
    const modifiedQuestionPointParams = {};
    this.stageParamForm.value.questionPointParams.forEach((item, index) => {
      const questionPoint = this.stageParam.questionPointParams[item.name];
      if ((!questionPoint && item.point && item.point !== 0) || (questionPoint && questionPoint.point !== item.point)) {
        if (!item.point) {
          item.point = 0;
        }
        modifiedQuestionPointParams[item.name] = item;
      }
    });
    return modifiedQuestionPointParams;
  }

  private getModifiedPerformancePointParams() {
    const modifiedPerformancePointParams = {};
    this.stageParamForm.value.performancePointParams.forEach((item, index) => {
      const performancePoint = this.stageParam.performancePointParams[item.name];
      item.ranges.forEach((range, rangeIndex) => {
        if (performancePoint.ranges.length > rangeIndex) {
          const rangePoint = performancePoint.ranges[rangeIndex];
          if (rangePoint.type !== range.type ||
            rangePoint.begin !== range.begin ||
            rangePoint.end !== range.end ||
            rangePoint.point !== range.point) {
            modifiedPerformancePointParams[item.name] = item;
          }
        } else {
          if (range.point && range.point !== 0 && range.type) {
            modifiedPerformancePointParams[item.name] = item;
          }
        }
      });
      item.ranges = item.ranges.filter(range => range.point && range.type);
    });
    return modifiedPerformancePointParams;
  }

  private getModifiedQuestionParams() {
    const modifiedQuestionParams = {};
    this.stageParamForm.value.questionParams.forEach((item, index) => {
      const question = this.stageParam.questionParams[item.name];
      if (!question) {
        modifiedQuestionParams[item.name] = item;
      } else {
        if (item.type !== question.type || item.staff !== question.staff) {
          modifiedQuestionParams[item.name] = { name: item.name };
          if (item.type !== question.type) {
            modifiedQuestionParams[item.name].type = item.type;
          }
          if (item.staff !== question.staff) {
            modifiedQuestionParams[item.name].staff = item.staff;
          }
        }
      }
    });
    this.removedQuestionParams.forEach((removed, index) => {
      modifiedQuestionParams[removed] = { name: removed };
    });
    return modifiedQuestionParams;
  }

  onPerfPointAllocationType(value, perfIndex, rangeIndex){

    const perfDateRankingTypeId: string = 'perfDateRankingType_' + perfIndex + '_' + rangeIndex;
    const perfResultRankingTypeId: string = 'perfResultRankingType_' + perfIndex + '_' + rangeIndex;
    const perfScoreIntervLabelId: string = 'perfScoreIntervLabel_' + perfIndex + '_' + rangeIndex;
    const perfVoidTypeId: string = 'perfVoidType_' + perfIndex + '_' + rangeIndex;
    const perfDateRankingIntervLabelId: string = 'perfDateRankingIntervLabel_' + perfIndex + '_' + rangeIndex;
    const perfResultRankingIntervLabelId: string = 'perfResultRankingIntervLabel_' + perfIndex + '_' + rangeIndex;
    const perfVoidIntervLabelId: string = 'perfVoidIntervLabel_' + perfIndex + '_' + rangeIndex;

    const perfDateRankingTypeTarget = document.getElementById(perfDateRankingTypeId);
    const perfResultRankingTypeTarget = document.getElementById(perfResultRankingTypeId);
    const perfScoreIntervLabelTarget = document.getElementById(perfScoreIntervLabelId);
    const perfVoidTypeTarget = document.getElementById(perfVoidTypeId);
    const perfDateRankingIntervLabelTarget = document.getElementById(perfDateRankingIntervLabelId);
    const perfResultRankingIntervLabelTarget = document.getElementById(perfResultRankingIntervLabelId);
    const perfVoidIntervLabelTarget = document.getElementById(perfVoidIntervLabelId);

    switch(value) {
      case "SCORE":
        perfDateRankingTypeTarget.hidden = true;
        perfResultRankingTypeTarget.hidden = true;
        perfScoreIntervLabelTarget.hidden = false;
        perfVoidTypeTarget.hidden = false;
        perfDateRankingIntervLabelTarget.hidden = true;
        perfResultRankingIntervLabelTarget.hidden = true;
        perfVoidIntervLabelTarget.hidden = true;
        break;
      case "DATE":
        perfDateRankingTypeTarget.hidden = false;
        perfResultRankingTypeTarget.hidden = true;
        perfScoreIntervLabelTarget.hidden = true;
        perfVoidTypeTarget.hidden = true;
        perfDateRankingIntervLabelTarget.hidden = false;
        perfResultRankingIntervLabelTarget.hidden = true;
        perfVoidIntervLabelTarget.hidden = true;
        break;
      case "RANK":
        perfDateRankingTypeTarget.hidden = true;
        perfResultRankingTypeTarget.hidden = false;
        perfScoreIntervLabelTarget.hidden = true;
        perfVoidTypeTarget.hidden = true;
        perfDateRankingIntervLabelTarget.hidden = true;
        perfResultRankingIntervLabelTarget.hidden = false;
        perfVoidIntervLabelTarget.hidden = true;
        break;
      default:
        perfDateRankingTypeTarget.hidden = true;
        perfResultRankingTypeTarget.hidden = true;
        perfScoreIntervLabelTarget.hidden = true;
        perfVoidTypeTarget.hidden = false;
        perfDateRankingIntervLabelTarget.hidden = true;
        perfResultRankingIntervLabelTarget.hidden = true;
        perfVoidIntervLabelTarget.hidden = false;
        break;
    }
  }
}
