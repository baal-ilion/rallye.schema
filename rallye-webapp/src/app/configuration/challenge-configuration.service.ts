import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';
import { HalCollection } from '../models/hal-collection';
import { ChallengeConfiguration } from './models/challenge-configuration';

@Injectable({
  providedIn: 'root'
})
export class ChallengeConfigurationService {

  constructor(private http: HttpClient) { }

  getChallengeConfigurations(): Observable<HalCollection<ChallengeConfiguration, 'challengeConfigurations'>> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/challengeConfigurations');
  }

  updateChallengeConfiguration(challenge: ChallengeConfiguration): Observable<ChallengeConfiguration> {
    console.log(challenge);
    return this.http.patch<ChallengeConfiguration>(AppConfigService.settings.apiUrl.rallyeSchema + '/challengeConfigurations', challenge);
  }

  addChallengeConfiguration(challenge: ChallengeConfiguration): Observable<ChallengeConfiguration> {
    console.log(challenge);
    return this.http.post<ChallengeConfiguration>(AppConfigService.settings.apiUrl.rallyeSchema + '/challengeConfigurations', challenge);
  }

  findByChallenge(challengeNumber: number): Observable<ChallengeConfiguration> {
    const params = new HttpParams().set('challenge', challengeNumber.toString());
    return this.http.get<ChallengeConfiguration>(AppConfigService.settings.apiUrl.rallyeSchema + '/challengeConfigurations/search/findByChallenge', { params });
  }

  findById(id: string): Observable<ChallengeConfiguration> {
    return this.http.get<ChallengeConfiguration>(AppConfigService.settings.apiUrl.rallyeSchema + '/challengeConfigurations/' + id);
  }

  deleteChallengeConfiguration(id: string): Observable<any> {
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/challengeConfigurations/' + id);
  }
}
