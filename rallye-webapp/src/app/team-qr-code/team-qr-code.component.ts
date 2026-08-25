import { Component, OnDestroy, OnInit } from '@angular/core';
import { Team } from '../configuration/models/team';
import { TeamService } from '../configuration/team.service';
import { QRCodeElementType, QRCodeErrorCorrectionLevel } from 'angularx-qrcode';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TeamUpdateService } from '../services/team-update.service';

@Component({
  selector: 'app-team-qr-code',
  templateUrl: './team-qr-code.component.html',
  styleUrls: ['./team-qr-code.component.scss']
})
export class TeamQrCodeComponent implements OnInit, OnDestroy {
  teamPages: { [page: number]: Team[] } = {};
  elementType: QRCodeElementType = 'canvas';
  correctionLevel: QRCodeErrorCorrectionLevel = 'H';
  respcluedisplay = btoa('respcluedisplay{{Voyage en terre de Naheulbeuk}}{{oui}}');
  respcluehidden = btoa('respcluehidden{{Voyage en terre de Naheulbeuk}}{{oui}}');
  toserver = btoa('toserver{{Voyage en terre de Naheulbeuk}}{{Voyage en terre de Naheulbeuk}}{{5}}');
  blairWitchProject = btoa('respcluehidden{{Blair Witch Project: Denouement}}{{oui}}');

  private destroy$ = new Subject<void>();

  constructor(private teamService: TeamService, private teamUpdateService: TeamUpdateService) { }

  ngOnInit() {
    this.loadTeams();
    this.teamUpdateService.updates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadTeams());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTeams(): void {
    this.teamService.getTeams().subscribe((value) => {
      const teams = value._embedded.teams;
      teams.sort((a, b) => (a.team > b.team) ? 1 : -1);
      let page = 0;
      let nb = 0;
      this.teamPages = { 0: [] };
      for (const element of teams) {
        if (nb >= 6) {
          page++;
          nb = 0;
          this.teamPages[page] = [];
        }
        this.teamPages[page].push(element);
        nb++;
      }
    }, (error) => {
      this.teamPages = {};
    });
  }

  teamnum(team: Team) {
    return btoa('teamnum{{' + team.team + '}}{{' + team.name + '}}');
  }
}
