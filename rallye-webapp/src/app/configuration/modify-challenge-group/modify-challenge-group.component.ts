import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ChallengeGroup } from '../models/challenge-group';
import { ChallengeGroupService } from '../../services/challenge-group.service';

@Component({
  selector: 'app-modify-challenge-group',
  templateUrl: './modify-challenge-group.component.html',
  styleUrls: ['./modify-challenge-group.component.scss']
})
export class ModifyChallengeGroupComponent implements OnInit {

  @Input() challengeGroup: ChallengeGroup;
  form: UntypedFormGroup;
  existingNames: string[] = [];

  constructor(
    private formBuilder: UntypedFormBuilder,
    private dialogRef: MatDialogRef<ModifyChallengeGroupComponent>,
    private challengeGroupService: ChallengeGroupService
  ) { }

  ngOnInit(): void {
    if (!this.challengeGroup) {
      this.challengeGroup = { name: '' };
    }

    this.challengeGroupService.getAll().subscribe(groups => {
      this.existingNames = groups
        .filter(g => g.id !== this.challengeGroup.id)
        .map(g => g.name?.trim() ?? '')
        .filter(n => n.length > 0);
    });

    this.form = this.formBuilder.group({
      id: this.challengeGroup.id,
      name: [this.challengeGroup.name, [Validators.required, this.uniqueNameValidator.bind(this)]]
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
