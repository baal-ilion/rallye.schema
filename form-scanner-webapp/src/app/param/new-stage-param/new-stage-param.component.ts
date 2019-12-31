import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { StageParamService } from '../stage-param.service';

@Component({
  selector: 'app-new-stage-param',
  templateUrl: './new-stage-param.component.html',
  styleUrls: ['./new-stage-param.component.scss']
})
export class NewStageParamComponent implements OnInit {
  stageParamForm: FormGroup;
  stageParams = [];

  constructor(
    public activeModal: NgbActiveModal,
    private formBuilder: FormBuilder,
    private stageParamService: StageParamService) { }

  ngOnInit() {
    this.createForm();
    this.stageParamService.getStageParams().toPromise().then((value) => {
      this.stageParams = value._embedded.stageParams;
      const stage = this.stageParams.length > 0 ? Math.max.apply(Math, this.stageParams.map(stageParam => stageParam.stage)) + 1 : 1;
      this.stageParamForm.controls.stage.setValue(stage);
    }, (error) => {
      this.stageParams = [];
    });
  }

  private createForm() {
    this.stageParamForm = this.formBuilder.group({
      stage: [1, [Validators.required, this.uniqueStageValidator.bind(this)]],
      name: ['', Validators.required]
    });
  }

  uniqueStageValidator(control: AbstractControl) {
    if (!control) { return null; }
    const stage = control.value;
    if (!stage) { return null; }
    if (this.stageParams.map(stageParam => stageParam.stage).some(value => value === stage)) {
      return { uniqueStage: true };
    }
    return null;
  }

  stageError() {
    return JSON.stringify(this.stageParamForm.controls.stage.errors);
  }

  private submitForm() {
    this.activeModal.close(this.stageParamForm.value);
  }
}
