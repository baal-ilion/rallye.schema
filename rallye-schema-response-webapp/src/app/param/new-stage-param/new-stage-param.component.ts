import { Component, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

import { StageParam } from '../models/stage-param';
import { StageParamService } from '../stage-param.service';

import { StageGroup } from '../models/stage-group';
import { StageGroupService } from 'src/app/services/stage-group.service';

@Component({
  selector: 'app-new-stage-param',
  templateUrl: './new-stage-param.component.html',
  styleUrls: ['./new-stage-param.component.scss']
})
export class NewStageParamComponent implements OnInit {

  stageParamForm: UntypedFormGroup;
  stageParams: StageParam[] = [];
  stageGroups: StageGroup[] = [];

  constructor(
    public dialogRef: MatDialogRef<NewStageParamComponent>,
    private formBuilder: UntypedFormBuilder,
    private stageParamService: StageParamService,
    private stageGroupService: StageGroupService,
  ) { }

  ngOnInit() {
    this.createForm();

    // Charger les groupes pour le <select>
    this.stageGroupService.getAll().subscribe({
      next: groups => this.stageGroups = groups,
      error: () => this.stageGroups = []
    });

    // Charger les épreuves existantes pour calculer le prochain numéro de stage
    this.stageParamService.getStageParams().toPromise().then((value) => {
      this.stageParams = value._embedded.stageParams;
      const stage = this.stageParams.length > 0
        ? Math.max.apply(Math, this.stageParams.map(stageParam => stageParam.stage)) + 1
        : 1;
      this.stageParamForm.controls.stage.setValue(stage);
    }, (error) => {
      this.stageParams = [];
    });
  }

  private createForm() {
    this.stageParamForm = this.formBuilder.group({
      stage: [1, [Validators.required, this.uniqueStageValidator.bind(this)]],
      name: ['', Validators.required],
      group: [null]
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

  submitForm() {
    // On renvoie { stage, name, group } au composant parent
    const formValue = this.stageParamForm.value;
    const payload = {
      stage: formValue.stage,
      name: formValue.name,
      group: formValue.group
        ? { id: formValue.group.id, name: formValue.group.name, description: formValue.group.description }
        : null
    };
    this.dialogRef.close(payload);
  }
}
