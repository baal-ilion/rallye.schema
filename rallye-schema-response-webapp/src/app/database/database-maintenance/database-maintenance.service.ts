import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppConfigService } from 'src/app/app-config.service';

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
}
