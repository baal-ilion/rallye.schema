import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TeamUpdateService } from 'src/app/services/team-update.service';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { Team } from '../models/team';
import { ModifyTeamComponent } from '../modify-team/modify-team.component';
import { TeamService } from '../team.service';
import { sameData } from 'src/app/shared/data-change.utils';

@Component({
  selector: 'app-list-team',
  templateUrl: './list-team.component.html',
  styleUrls: ['./list-team.component.scss']
})
export class ListTeamComponent implements OnInit, OnDestroy {

  teams: Team[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private teamService: TeamService,
    private dialogService: DialogService,
    private confirmationDialogService: ConfirmationDialogService,
    private teamUpdates: TeamUpdateService
  ) { }

  ngOnInit() {
    this.teamUpdates.updates$.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadTeams());
    this.loadTeams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackTeam(_index: number, team: Team): string | number {
    return team.id ?? team.team;
  }

  private loadTeams() {
    this.teamService.getTeams().subscribe((value) => {
      const nextTeams = [...(value._embedded.teams ?? [])].sort((a, b) => (a.team > b.team) ? 1 : -1);
      if (!sameData(this.teams, nextTeams)) {
        this.teams = nextTeams;
      }
    }, (error) => {
      this.teams = [];
    });
  }

  addTeam() {
    const modalRef = this.dialogService.open(ModifyTeamComponent);
    modalRef.componentInstance.team = {
      team: null as any,
      name: '',
      present: false
    };
    modalRef.result.then((result) => {
      console.log(result);
      if (!result) { return; }
      this.teamService.addTeam(result as Team).subscribe(data => {
        this.loadTeams();
      }, err => {
        console.log(err);
        this.loadTeams();
      });
    }).catch((error) => {
      console.log(error);
    });
  }

  modifyTeam(team: Team) {
    const modalRef = this.dialogService.open(ModifyTeamComponent);
    modalRef.componentInstance.team = {
      id: team.id,
      team: team.team,
      name: team.name,
      present: team.present
    };
    modalRef.result.then((result) => {
      console.log(result);
      if (!result) { return; }
      this.teamService.updateTeam(result as Team).subscribe(data => {
        this.loadTeams();
      }, err => {
        console.log(err);
        this.loadTeams();
      });
    }).catch((error) => {
      console.log(error);
    });
  }

  async deleteTeam(team: Team) {
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Suppression de l\'équipe ' + team.name,
        'Cette opération est irréversible.\nVoulez-vous supprimer l\'équipe ' + team.team + ' - ' + team.name + ' ?',
        'Oui', 'Non');
      console.log('User confirmed:', confirmed);
      try {
        if (confirmed) {
          await this.teamService.deleteTeam(team.id).toPromise();
        }
        this.loadTeams();
      } catch (error) {
        console.log(error);
        this.loadTeams();
      }
    } catch (error) {
      console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      this.loadTeams();
    }
  }
}
