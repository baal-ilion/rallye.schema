import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppConfigService } from 'src/app/app-config.service';
import { Observable } from 'rxjs';

export interface ConsistencyIssue {
  code: string;
  description: string;
  count: number;
  ids?: string[];
  autoFixable: boolean;
  details?: string;
}

export interface ConsistencyReport {
  issues: ConsistencyIssue[];
  autoFixApplied?: number;
  remaining?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseMaintenanceService {

  constructor(private http: HttpClient) { }

  restoreDatabase(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(AppConfigService.settings.apiUrl.rallyeSchema + '/database/restore', formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  eraseDatabase() {
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/database');
  }

  getConsistencyReport(): Observable<ConsistencyReport> {
    return this.http.get<ConsistencyReport>(AppConfigService.settings.apiUrl.rallyeSchema + '/database/consistency');
  }

  fixConsistency(): Observable<ConsistencyReport> {
    return this.http.post<ConsistencyReport>(AppConfigService.settings.apiUrl.rallyeSchema + '/database/consistency/fix', {});
  }

  fixConsistencySelected(codes: string[]): Observable<ConsistencyReport> {
    return this.http.post<ConsistencyReport>(AppConfigService.settings.apiUrl.rallyeSchema + '/database/consistency/fix-selected', codes || []);
  }
}
