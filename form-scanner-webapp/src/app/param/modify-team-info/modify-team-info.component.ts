import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TeamInfoService } from '../team-info.service';

@Component({
  selector: 'app-modify-team-info',
  templateUrl: './modify-team-info.component.html',
  styleUrls: ['./modify-team-info.component.scss']
})
export class ModifyTeamInfoComponent implements OnInit {
  @Input() teamInfo: any;
  teamInfoForm: FormGroup;
  teamInfos: any[] = [];

  constructor(
    public activeModal: NgbActiveModal,
    private formBuilder: FormBuilder,
    private teamInfoService: TeamInfoService) { }

  ngOnInit() {
    this.teamInfoService.getTeamInfos().toPromise().then((value) => {
      this.teamInfos = value._embedded.teamInfoes;
    }, (error) => {
      this.teamInfos = [];
    });
    this.createForm();
  }

  private createForm() {
    this.teamInfoForm = this.formBuilder.group({
      id: this.teamInfo.id,
      name: [this.teamInfo.name, [Validators.required, this.uniqueNameValidator.bind(this)]],
      team: [this.teamInfo.team, [Validators.required, this.uniqueTeamValidator.bind(this)]]
    });
    if (this.teamInfo.id) {
      this.teamInfoForm.controls.team.disable();
    }
  }

  uniqueNameValidator(control: AbstractControl) {
    if (!control) { return null; }
    const name = control.value;
    if (!name || this.teamInfo.name === name) { return null; }
    if (this.teamInfos.map(teamInfo => teamInfo.name).some(value => value === name)) {
      return { uniqueName: true };
    }
    return null;
  }

  uniqueTeamValidator(control: AbstractControl) {
    if (!control) { return null; }
    const team = control.value;
    if (!team || this.teamInfo.team === team) { return null; }
    if (this.teamInfos.map(teamInfo => teamInfo.team).some(value => value === team)) {
      return { uniqueTeam: true };
    }
    return null;
  }

  private submitForm() {
    this.activeModal.close(this.teamInfoForm.getRawValue());
  }
}
