import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import { LogFileService } from '../log-file.service';

@Component({
  selector: 'app-log-files',
  templateUrl: './log-files.component.html',
  styleUrls: ['./log-files.component.scss']
})
export class LogFilesComponent implements OnInit {
  logFileTeams: Observable<number[]>;
  apiUrl = AppConfigService.settings.apiUrl.rallyeSchema;

  constructor(private logFileService: LogFileService) { }

  ngOnInit() {
    this.logFileTeams = this.logFileService.findTeams();
  }
}
