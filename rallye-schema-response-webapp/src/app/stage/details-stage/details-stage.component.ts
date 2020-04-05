import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { StageParamService } from 'src/app/param/stage-param.service';
import { UploadFileService } from 'src/app/upload/upload-file.service';
import { StageResult } from '../models/stage-result';
import { StageService } from '../stage.service';
import { HalLink } from 'src/app/models/hal-link';

@Component({
  selector: 'app-details-stage',
  templateUrl: './details-stage.component.html',
  styleUrls: ['./details-stage.component.scss']
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
    private stageParamService: StageParamService) { }

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
      checked: this.stage.checked
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
    this.stageService.updateStage({
      id: this.stage.id,
      team: this.stage.team,
      stage: this.stage.stage,
      checked: this.form.value.checked,
      results: modifiedResults,
      performances: modifiedperformances
    });
    this.reload();
  }

  reload() {
    this.stageService.getResource<StageResult>(this.stage._links.self.href).subscribe(data => {
      this.stage = data;
      this.ngOnInit();
    });
  }
}
