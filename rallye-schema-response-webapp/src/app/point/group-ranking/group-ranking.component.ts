import { DatePipe, KeyValue } from '@angular/common';
import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import { TeamInfo } from '../../param/models/team-info';
import { TeamInfoService } from '../../param/team-info.service';
import { GroupRankingEntry, GroupRankingService } from '../../services/group-ranking.service';
import { Ranking } from '../models/ranking';
import { RankingComponent } from '../ranking/ranking.component';

@Component({
  selector: 'app-group-ranking',
  templateUrl: './group-ranking.component.html',
  styleUrls: ['./group-ranking.component.scss']
})
export class GroupRankingComponent implements OnInit {

  loading = false;
  error: string | null = null;

  // groupName -> ranking entries
  groupRankings: { [groupName: string]: Ranking[] } = {};
  teamInfos: { [team: number]: TeamInfo } = {};
  @ViewChildren(RankingComponent) rankingTables!: QueryList<RankingComponent>;
  viewPoints = true;

  groupOrder = (a: KeyValue<string, Ranking[]>, b: KeyValue<string, Ranking[]>) =>
    a.key.localeCompare(b.key);

  constructor(
    private groupRankingService: GroupRankingService,
    private teamInfoService: TeamInfoService) { }

  ngOnInit(): void {
    this.loadTeamInfos();
    this.loadGroupRankings();
  }

  private toRanking(entries: GroupRankingEntry[]): Ranking[] {
    return entries
      .filter(entry => (entry.groupScore ?? 0) > 0)
      .map(entry => ({
        order: entry.groupRank ? entry.groupRank.toString() : '-',
        team: entry.team,
        total: entry.groupScore
      }));
  }

  private loadTeamInfos(): void {
    this.teamInfos = {};
    this.teamInfoService.getTeamInfos().subscribe((value) => {
      const teamInfos = value._embedded.teamInfoes;
      this.teamInfos = {};
      teamInfos.forEach(teamInfo => {
        this.teamInfos[teamInfo.team] = teamInfo;
      });
    }, () => {
      this.teamInfos = {};
    });
  }

  private loadGroupRankings(): void {
    this.loading = true;
    this.error = null;
    this.groupRankings = {};

    this.groupRankingService.getGroupRankings().subscribe({
      next: (entries) => {
        // Regroupement par nom de groupe
        const byGroup: { [groupName: string]: GroupRankingEntry[] } = {};

        entries.forEach(entry => {
          const name = entry.groupName || 'Sans groupe';
          if (!byGroup[name]) {
            byGroup[name] = [];
          }
          byGroup[name].push(entry);
        });

        // Tri interne par rang dans le groupe
        Object.keys(byGroup).forEach(groupName => {
          byGroup[groupName].sort((a, b) => a.groupRank - b.groupRank);
        });

        Object.keys(byGroup).forEach(groupName => {
          const ranking = this.toRanking(byGroup[groupName]);
          if (ranking.length > 0) {
            this.groupRankings[groupName] = ranking;
          }
        });
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Erreur lors du chargement du classement par groupes.';
        this.loading = false;
      }
    });
  }

  exportExcel() {
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    this.rankingTables.forEach(ranking => {
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(ranking.rankingTable.nativeElement);
      XLSX.utils.book_append_sheet(wb, ws, ranking.rankingTitle.substring(0, 31));
    });
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    this.saveAsExcelFile(excelBuffer, 'rallyeschema-groupes');
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const datePipe = new DatePipe('fr-FR');
    FileSaver.saveAs(data, fileName + '-ranking-' + datePipe.transform(Date.now(), 'yyyyMMddhhmmss') + '.xlsx');
  }
}
