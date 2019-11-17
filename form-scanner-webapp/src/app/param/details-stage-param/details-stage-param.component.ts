import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, FormArray, FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { StageParamService } from '../stage-param.service';

@Component({
  selector: 'app-details-stage-param',
  templateUrl: './details-stage-param.component.html',
  styleUrls: ['./details-stage-param.component.scss']
})
export class DetailsStageParamComponent implements OnInit {
  @Input() stageParam: any;

  form: FormGroup;
  removedQuestionParams = [];
  questionParamNames = [];
  questionParamName = '';

  constructor(private formBuilder: FormBuilder, private stageParamService: StageParamService) { }
  // convenience getters for easy access to form fields
  get f() { return this.form.controls; }
  get questionPointParams() { return this.f.questionPointParams as FormArray; }
  get questionParams() { return this.f.questionParams as FormArray; }

  ngOnInit() {
    this.questionParamName = '';
    this.removedQuestionParams = [];
    this.questionParamNames = [];
    this.form = this.formBuilder.group({
      questionPointParams: this.formBuilder.array([]),
      questionParams: this.formBuilder.array([])
    });
    const questionKeys = Object.keys(this.stageParam.questionParams);
    for (const questionKey of questionKeys) {
      const questionParam = this.stageParam.questionParams[questionKey];
      this.initQuestionPointParam(questionParam);
      this.initQuestionParam(questionParam);
    }
  }

  private initQuestionPointParam(questionParam: any) {
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
    }
  }

  private initQuestionParam(questionParam: any) {
    if (questionParam.type === 'QUESTION' || questionParam.type === 'PERFORMANCE') {
      this.questionParams.push(this.formBuilder.group({
        name: questionParam.name,
        type: questionParam.type,
        staff: questionParam.staff
      }));
      this.questionParamNames.push(questionParam.name);
    }
  }

  addQuestionParam(paramName) {
    if (!this.questionParamNames.includes(paramName)) {
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

  removeQuestionParam(index) {
    this.removedQuestionParams.push(this.questionParams.at(index).value.name);
    const i = this.removedQuestionParams.indexOf(this.questionParams.at(index).value.name, 0);
    if (i > -1) {
      this.removedQuestionParams.splice(i, 1);
    }
    this.questionParams.removeAt(index);
  }

  onSubmit() {
    const modifiedQuestionPointParams = this.getModifiedQuestionPointParams();
    const modifiedQuestionParams = this.getModifiedQuestionParams();
    this.stageParamService.updateStageParam({
      id: this.stageParam.id,
      stage: this.stageParam.stage,
      questionPointParams: modifiedQuestionPointParams,
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
    this.form.value.questionPointParams.forEach((item, index) => {
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

  private getModifiedQuestionParams() {
    const modifiedQuestionParams = {};
    this.form.value.questionParams.forEach((item, index) => {
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
}
