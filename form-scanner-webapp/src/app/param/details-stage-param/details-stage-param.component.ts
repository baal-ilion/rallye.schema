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

  constructor(private formBuilder: FormBuilder, private stageParamService: StageParamService) { }
  // convenience getters for easy access to form fields
  get f() { return this.form.controls; }
  get results() { return this.f.results as FormArray; }

  ngOnInit() {
    this.form = this.formBuilder.group({
      results: this.formBuilder.array([])
    });
    for (const responseFileParam of this.stageParam.responseFileParams) {
      const questionKeys = Object.keys(responseFileParam.questions);
      for (const questionKey of questionKeys) {
        if (responseFileParam.questions[questionKey].type === 'QUESTION') {
          let pointValue = 0;
          const questionPoint = this.stageParam.questionPointParams[responseFileParam.questions[questionKey].name];
          if (questionPoint && questionPoint.point) {
            pointValue = questionPoint.point;
          }
          this.results.push(this.formBuilder.group({
            name: responseFileParam.questions[questionKey].name,
            point: pointValue
          }));
        }
      }
    }

  }

  onSubmit() {
    const modifiedQuestionPointParams = {};
    this.form.value.results.forEach((item, index) => {
      const questionPoint = this.stageParam.questionPointParams[item.name];
      if ((!questionPoint && item.point && item.point !== 0) || (questionPoint && questionPoint.point !== item.point)) {
        if (!item.point) {
          item.point = 0;
        }
        modifiedQuestionPointParams[item.name] = item;
      }
    });
    this.stageParamService.updateStageParam({
      id: this.stageParam.id, stage: this.stageParam.stage, questionPointParams: modifiedQuestionPointParams
    });
  }
}
