import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AppConfigService } from 'src/app/app-config.service';
import { ApplicationUpdateService } from 'src/app/services/application-update.service';
import { LogFileService } from '../log-file.service';

@Component({
  selector: 'app-log-files',
  templateUrl: './log-files.component.html',
  styleUrls: ['./log-files.component.scss']
})
export class LogFilesComponent implements OnInit, OnDestroy {
  logFileTeams: Observable<number[]>;
  apiUrl = AppConfigService.settings.apiUrl.rallyeSchema;
  private destroy$ = new Subject<void>();

  constructor(private logFileService: LogFileService, private applicationUpdates: ApplicationUpdateService) { }

  ngOnInit() {
    this.logFileTeams = this.logFileService.findTeams();
    this.applicationUpdates.updates$.pipe(
      filter(update => update.domain === 'LOGS' || update.domain === 'TEAMS'
        || update.domain === 'DATABASE' || update.domain === 'RESYNC'),
      takeUntil(this.destroy$)
    ).subscribe(() => this.logFileTeams = this.logFileService.findTeams());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
