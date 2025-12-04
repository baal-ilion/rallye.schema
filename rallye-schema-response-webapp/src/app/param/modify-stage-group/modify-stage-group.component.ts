import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { StageGroup } from '../models/stage-group';
import { StageGroupService } from '../../services/stage-group.service';

@Component({
  selector: 'app-modify-stage-group',
  templateUrl: './modify-stage-group.component.html',
  styleUrls: ['./modify-stage-group.component.scss']
})
export class ModifyStageGroupComponent implements OnInit {

  @Input() stageGroup: StageGroup;
  form: UntypedFormGroup;
  existingNames: string[] = [];

  constructor(
    private formBuilder: UntypedFormBuilder,
    private dialogRef: MatDialogRef<ModifyStageGroupComponent>,
    private stageGroupService: StageGroupService
  ) { }

  ngOnInit(): void {
    if (!this.stageGroup) {
      this.stageGroup = { name: '', description: '' };
    }

    this.stageGroupService.getAll().subscribe(groups => {
      this.existingNames = groups
        .filter(g => g.id !== this.stageGroup.id)
        .map(g => g.name?.trim() ?? '')
        .filter(n => n.length > 0);
    });

    this.form = this.formBuilder.group({
      id: this.stageGroup.id,
      name: [this.stageGroup.name, [Validators.required, this.uniqueNameValidator.bind(this)]],
      description: this.stageGroup.description ?? ''
    });
  }

  uniqueNameValidator(control: any) {
    const value = (control?.value ?? '').trim();
    if (!value) {
      return null;
    }
    if (this.existingNames.includes(value)) {
      return { uniqueName: true };
    }
    return null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
