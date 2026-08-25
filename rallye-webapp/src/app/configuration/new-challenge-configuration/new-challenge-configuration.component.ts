import { Component, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

import { ChallengeConfiguration } from '../models/challenge-configuration';
import { ChallengeConfigurationService } from '../challenge-configuration.service';

import { ChallengeGroup } from '../models/challenge-group';
import { ChallengeGroupService } from 'src/app/services/challenge-group.service';

@Component({
  selector: 'app-new-challenge-configuration',
  templateUrl: './new-challenge-configuration.component.html',
  styleUrls: ['./new-challenge-configuration.component.scss']
})
export class NewChallengeConfigurationComponent implements OnInit {

  challengeConfigurationForm: UntypedFormGroup;
  challengeConfigurations: ChallengeConfiguration[] = [];
  challengeGroups: ChallengeGroup[] = [];

  constructor(
    public dialogRef: MatDialogRef<NewChallengeConfigurationComponent>,
    private formBuilder: UntypedFormBuilder,
    private challengeConfigurationService: ChallengeConfigurationService,
    private challengeGroupService: ChallengeGroupService,
  ) { }

  ngOnInit() {
    this.createForm();

    // Charger les groupes pour le <select>
    this.challengeGroupService.getAll().subscribe({
      next: groups => this.challengeGroups = groups,
      error: () => this.challengeGroups = []
    });

    // Charger les épreuves existantes pour calculer le prochain numéro de challenge
    this.challengeConfigurationService.getChallengeConfigurations().toPromise().then((value) => {
      this.challengeConfigurations = value._embedded.challengeConfigurations;
      const challenge = this.challengeConfigurations.length > 0
        ? Math.max.apply(Math, this.challengeConfigurations.map(challengeConfiguration => challengeConfiguration.challenge)) + 1
        : 1;
      this.challengeConfigurationForm.controls.challenge.setValue(challenge);
    }, (error) => {
      this.challengeConfigurations = [];
    });
  }

  private createForm() {
    this.challengeConfigurationForm = this.formBuilder.group({
      challenge: [1, [Validators.required, this.uniqueChallengeValidator.bind(this)]],
      name: ['', Validators.required],
      group: [null]
    });
  }

  uniqueChallengeValidator(control: AbstractControl) {
    if (!control) { return null; }
    const challenge = control.value;
    if (!challenge) { return null; }
    if (this.challengeConfigurations.map(challengeConfiguration => challengeConfiguration.challenge).some(value => value === challenge)) {
      return { uniqueChallenge: true };
    }
    return null;
  }

  challengeError() {
    return JSON.stringify(this.challengeConfigurationForm.controls.challenge.errors);
  }

  submitForm() {
    // On renvoie { challenge, name, group } au composant parent
    const formValue = this.challengeConfigurationForm.value;
    const payload = {
      challenge: formValue.challenge,
      name: formValue.name,
      group: formValue.group
        ? { id: formValue.group.id, name: formValue.group.name }
        : null
    };
    this.dialogRef.close(payload);
  }
}
