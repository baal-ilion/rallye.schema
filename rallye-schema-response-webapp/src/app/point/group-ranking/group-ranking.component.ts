import { DatePipe, KeyValue } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { forkJoin, of, Subject } from 'rxjs';
import { auditTime, catchError, finalize, startWith, switchMap, takeUntil, tap, map } from 'rxjs/operators';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import { TeamInfo } from '../../param/models/team-info';
import { TeamInfoService } from '../../param/team-info.service';
import { GroupRankingEntry, GroupRankingService } from '../../services/group-ranking.service';
import { RankingUpdateService } from '../../services/ranking-update.service';
import { Ranking } from '../models/ranking';
import { RankingComponent } from '../ranking/ranking.component';
import { AutoScrollService } from '../../services/auto-scroll.service';

@Component({
  selector: 'app-group-ranking',
  templateUrl: './group-ranking.component.html',
  styleUrls: ['./group-ranking.component.scss']
})
export class GroupRankingComponent implements OnInit, OnDestroy {

  loading = false;
  error: string | null = null;

  // groupName -> ranking entries
  groupRankings: { [groupName: string]: Ranking[] } = {};
  teamInfos: { [team: number]: TeamInfo } = {};
  @ViewChildren(RankingComponent) rankingTables!: QueryList<RankingComponent>;
  @ViewChild('scrollContainer', { static: true }) scrollContainer?: ElementRef<HTMLElement>;
  viewPoints = true;
  autoScrollEnabled = false;
  private destroy$ = new Subject<void>();

  groupOrder = (a: KeyValue<string, Ranking[]>, b: KeyValue<string, Ranking[]>) =>
    a.key.localeCompare(b.key);

  constructor(
    private groupRankingService: GroupRankingService,
    private teamInfoService: TeamInfoService,
    private rankingUpdateService: RankingUpdateService,
    private autoScrollService: AutoScrollService) { }

  ngOnInit(): void {
    this.rankingUpdateService.updates$
      .pipe(
        startWith('__initial__' as const),          // initial load flag
        auditTime(200),           // regroupe les rafales de messages
        switchMap((flag) => this.refreshData(flag !== '__initial__')),
        takeUntil(this.destroy$)
      ).subscribe();
  }

  ngOnDestroy(): void {
    this.autoScrollService.stop();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onToggleAutoScroll(): void {
    this.autoScrollEnabled = !this.autoScrollEnabled;
    if (this.autoScrollEnabled) {
      const target = this.scrollContainer?.nativeElement;
      this.autoScrollService.start(target);
    } else {
      this.autoScrollService.stop();
    }
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

  private refreshData(silentRefresh = false) {
    if (!silentRefresh) {
      this.loading = true;
      this.error = null;
    }

    return this.ensureTeamInfos().pipe(
      switchMap(() => this.refreshGroupRankings()),
      catchError(err => {
        console.error(err);
        this.error = 'Erreur lors du chargement du classement par groupes.';
        return of();
      }),
      finalize(() => {
        if (!silentRefresh) {
          this.loading = false;
        }
      })
    );
  }

  private ensureTeamInfos() {
    if (Object.keys(this.teamInfos).length > 0) {
      return of(void 0);
    }
    return this.teamInfoService.getTeamInfos().pipe(
      tap(teamsResponse => {
        const embedded: any = teamsResponse?._embedded || {};
        const teamInfos = embedded.teamInfoes || embedded.teamInfos || [];
        teamInfos.forEach((teamInfo: TeamInfo) => {
          this.teamInfos[teamInfo.team] = teamInfo;
        });
      }),
      map(() => void 0)
    );
  }

  private refreshGroupRankings() {
    return this.groupRankingService.getGroupRankings().pipe(
      tap(entries => {
        const byGroup: { [groupName: string]: GroupRankingEntry[] } = {};
        entries.forEach(entry => {
          const name = entry.groupName || 'Sans groupe';
          if (!byGroup[name]) {
            byGroup[name] = [];
          }
          byGroup[name].push(entry);
        });

        Object.keys(byGroup).forEach(groupName => {
          byGroup[groupName].sort((a, b) => a.groupRank - b.groupRank);
        });

        const newRankings: { [groupName: string]: Ranking[] } = {};
        Object.keys(byGroup).forEach(groupName => {
          const ranking = this.toRanking(byGroup[groupName]);
          if (ranking.length > 0) {
            newRankings[groupName] = ranking;
          }
        });
        this.groupRankings = newRankings;
      })
    );
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
