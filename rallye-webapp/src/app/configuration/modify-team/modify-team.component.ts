import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Team } from '../models/team';
import { TeamService } from '../team.service';

@Component({
  selector: 'app-modify-team',
  templateUrl: './modify-team.component.html',
  styleUrls: ['./modify-team.component.scss']
})
export class ModifyTeamComponent implements OnInit {
  @Input() team: Team;
  teamForm: UntypedFormGroup;
  teams: Team[] = [];

  constructor(
    public dialogRef: MatDialogRef<ModifyTeamComponent>,
    private formBuilder: UntypedFormBuilder,
    private teamService: TeamService) { }

  ngOnInit() {
    this.teamService.getTeams().toPromise().then((value) => {
      this.teams = value._embedded.teams;
      this.teamForm?.controls.team.updateValueAndValidity();
      this.teamForm?.controls.name.updateValueAndValidity();
    }, (error) => {
      this.teams = [];
    });
    this.createForm();
  }

  private createForm() {
    this.teamForm = this.formBuilder.group({
      id: this.team.id,
      name: [this.team.name, [Validators.required, this.uniqueNameValidator.bind(this)]],
      team: [this.team.team, [Validators.required, Validators.min(1), this.uniqueTeamValidator.bind(this)]],
      present: this.team.present ?? false
    });

    // Revalider le numéro après chargement des données existantes
    this.teamForm.controls.team.updateValueAndValidity();
  }

  uniqueNameValidator(control: AbstractControl) {
    if (!control) { return null; }
    const name = control.value;
    if (!name || this.team.name === name) { return null; }
    if (this.teams.map(team => team.name).some(value => value === name)) {
      return { uniqueName: true };
    }
    return null;
  }

  uniqueTeamValidator(control: AbstractControl) {
    if (!control) { return null; }
    const team = control.value;
    if (!team || this.team.team === team) { return null; }
    if (this.teams.map(team => team.team).some(value => value === team)) {
      return { uniqueTeam: true };
    }
    return null;
  }

  submitForm() {
    this.dialogRef.close(this.teamForm.getRawValue());
  }
}
