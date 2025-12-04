import { Component, OnInit } from '@angular/core';
import { TeamInfo } from '../param/models/team-info';
import { TeamInfoService } from '../param/team-info.service';
import { QRCodeElementType, QRCodeErrorCorrectionLevel } from 'angularx-qrcode';

@Component({
  selector: 'app-qrcode',
  templateUrl: './qrcode.component.html',
  styleUrls: ['./qrcode.component.scss']
})
export class QrcodeComponent implements OnInit {
  teamInfoPages: { [page: number]: TeamInfo[] } = {};
  elementType: QRCodeElementType = 'canvas';
  correctionLevel: QRCodeErrorCorrectionLevel = 'H';
  respcluedisplay = btoa('respcluedisplay{{Voyage en terre de Naheulbeuk}}{{oui}}');
  respcluehidden = btoa('respcluehidden{{Voyage en terre de Naheulbeuk}}{{oui}}');
  toserver = btoa('toserver{{Voyage en terre de Naheulbeuk}}{{Voyage en terre de Naheulbeuk}}{{5}}');
  blairWitchProject = btoa('respcluehidden{{Blair Witch Project: Denouement}}{{oui}}');

  constructor(private teamInfoService: TeamInfoService) { }

  ngOnInit() {
    this.teamInfoService.getTeamInfos().subscribe((value) => {
      const teamInfos = value._embedded.teamInfoes;
      teamInfos.sort((a, b) => (a.team > b.team) ? 1 : -1);
      let page = 0;
      let nb = 0;
      this.teamInfoPages = { 0: [] };
      for (const element of teamInfos) {
        if (nb >= 6) {
          page++;
          nb = 0;
          this.teamInfoPages[page] = [];
        }
        this.teamInfoPages[page].push(element);
        nb++;
      }
    }, (error) => {
      this.teamInfoPages = {};
    });
  }

  teamnum(teaminfo: TeamInfo) {
    return btoa('teamnum{{' + teaminfo.team + '}}{{' + teaminfo.name + '}}');
  }
}
