import { Component, OnInit, Input } from '@angular/core';
import { UploadFileService } from 'src/app/upload/upload-file.service';
import { Observable, of } from 'rxjs';
import { FormGroup, FormBuilder, FormArray } from '@angular/forms';
import { stringify } from 'querystring';
import { StageService } from '../stage.service';
import { StageParamService } from 'src/app/param/stage-param.service';

@Component({
  selector: 'app-details-stage',
  templateUrl: './details-stage.component.html',
  styleUrls: ['./details-stage.component.scss']
})
export class DetailsStageComponent implements OnInit {

  @Input() stage: any;

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
  get preformances() { return this.f.preformances as FormArray; }

  ngOnInit() {
    this.param = null;
    this.files = [];
    if (this.stage._links && this.stage._links.responseFiles) {
      for (const responseFile of this.stage._links.responseFiles) {
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
      preformances: this.formBuilder.array([]),
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
          const preformance = this.stage.preformances.find(element => element.name === questionParam.name);
          this.preformances.push(this.formBuilder.group({
            name: questionParam.name,
            preformanceValue: preformance ? preformance.preformanceValue : null
          }));
        }
      }
    });
  }

  onSubmit() {
    const modifiedResults = [];
    this.form.value.results.forEach((item, index) => {
      const result = this.stage.results.find(element => element.name === item.name);
      if (!result || item.resultValue !== result.resultValue) {
        modifiedResults.push(item);
      }
    });
    const modifiedPreformances = [];
    this.form.value.preformances.forEach((item, index) => {
      const preformance = this.stage.preformances.find(element => element.name === item.name);
      if (!preformance || item.preformanceValue !== preformance.preformanceValue) {
        modifiedPreformances.push(item);
      }
    });
    this.stageService.updateStage({
      id: this.stage.id,
      team: this.stage.team,
      stage: this.stage.stage,
      checked: this.form.value.checked,
      results: modifiedResults,
      preformances: modifiedPreformances
    });
    this.reload();
  }

  reload() {
    this.stageService.getResource(this.stage._links.self.href).subscribe(data => {
      this.stage = data;
      this.ngOnInit();
    });
  }
}
