import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';
import { HalCollection } from '../models/hal-collection';
import { ChallengeCriteria } from './models/challenge-criteria';
import { ChallengeResponse } from './models/challenge-response';
import { ChallengeResult } from './models/challenge-result';

@Injectable({
  providedIn: 'root'
})
export class ChallengeService {

  constructor(private http: HttpClient) { }

  getChallenges(crit: ChallengeCriteria): Observable<HalCollection<ChallengeResult, 'challengeResults'>> {
    let params = new HttpParams();
    if (crit.challenge) {
      params = params.set('challenge', crit.challenge.toString());
    }
    if (crit.team) {
      params = params.set('team', crit.team.toString());
    }
    if (crit.checked === true || crit.checked === false) {
      params = params.set('checked', crit.checked.toString());
    }
    if (crit.entered === true || crit.entered === false) {
      params = params.set('entered', crit.entered.toString());
    }
    if (crit.finished === true || crit.finished === false) {
      params = params.set('finished', crit.finished.toString());
    }
    if (crit.sortBy) {
      for (const by of crit.sortBy) {
        params = params.append('sortBy', by.toString());
      }
    }
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/challengeResults', { params });
  }

  getChallengesByTeam(team: number): Observable<HalCollection<ChallengeResult, 'challengeResults'>> {
    const params = new HttpParams().set('team', team.toString());
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/challengeResults/search/findByTeam', { params });
  }

  updateChallenge(challenge: ChallengeResult): Observable<ChallengeResult> {
    console.log(challenge);
    return this.http.patch<ChallengeResult>(AppConfigService.settings.apiUrl.rallyeSchema + '/challengeResults', challenge);
  }

  beginChallenge(challengeNumber: number, team: number): Observable<ChallengeResult> {
    const params = new HttpParams().set('challenge', challengeNumber.toString()).set('team', team.toString());
    return this.http.post<ChallengeResult>(AppConfigService.settings.apiUrl.rallyeSchema + '/challengeResults/begin', null, { params });
  }

  endChallenge(challengeNumber: number, team: number): Observable<ChallengeResult> {
    const params = new HttpParams().set('challenge', challengeNumber.toString()).set('team', team.toString());
    return this.http.post<ChallengeResult>(AppConfigService.settings.apiUrl.rallyeSchema + '/challengeResults/end', null, { params });
  }

  cancelChallenge(challengeNumber: number, team: number): Observable<ChallengeResult> {
    const params = new HttpParams().set('challenge', challengeNumber.toString()).set('team', team.toString());
    return this.http.delete<ChallengeResult>(AppConfigService.settings.apiUrl.rallyeSchema + '/challengeResults/begin', { params });
  }

  undoChallenge(challengeNumber: number, team: number): Observable<ChallengeResult> {
    const params = new HttpParams().set('challenge', challengeNumber.toString()).set('team', team.toString());
    return this.http.delete<ChallengeResult>(AppConfigService.settings.apiUrl.rallyeSchema + '/challengeResults/end', { params });
  }

  findChallenge(challengeNumber: number, team: number): Observable<ChallengeResult> {
    const params = new HttpParams().set('challenge', challengeNumber.toString()).set('team', team.toString());
    return this.http.get<ChallengeResult>(AppConfigService.settings.apiUrl.rallyeSchema +
      '/challengeResults/search/findByChallengeAndTeam', { params });
  }

  getChallengeResponse(id: string): Observable<ChallengeResponse> {
    return this.http.get<ChallengeResult>(AppConfigService.settings.apiUrl.rallyeSchema +
      '/challengeResponses/' + id);
  }

  selectSubmittedForm(challengeNumber: number, team: number, submittedFormId: string, del: boolean): Observable<ChallengeResult> {
    const params = new HttpParams()
      .set('challenge', challengeNumber.toString())
      .set('team', team.toString())
      .set('submittedFormId', submittedFormId)
      .set('delete', del.toString());
    return this.http.post<ChallengeResult>(AppConfigService.settings.apiUrl.rallyeSchema +
      '/challengeResults/submittedForm', null, { params });
  }

  releaseSubmittedForm(challengeNumber: number, team: number, submittedFormId: string): Observable<ChallengeResult> {
    const params = new HttpParams()
      .set('challenge', challengeNumber.toString())
      .set('team', team.toString())
      .set('submittedFormId', submittedFormId);
    return this.http.post<ChallengeResult>(AppConfigService.settings.apiUrl.rallyeSchema +
      '/challengeResults/submittedForm/release', null, { params });
  }

  deleteSelectedSubmittedForm(challengeNumber: number, team: number, submittedFormId: string): Observable<ChallengeResult> {
    const params = new HttpParams()
      .set('challenge', challengeNumber.toString())
      .set('team', team.toString())
      .set('submittedFormId', submittedFormId);
    return this.http.delete<ChallengeResult>(AppConfigService.settings.apiUrl.rallyeSchema +
      '/challengeResults/submittedForm', { params });
  }

  getResource<T = any>(url: string): Observable<T> {
    try {
      const parsed = new URL(url, window.location.origin);
      return this.http.get<T>(`/api${parsed.pathname}${parsed.search}`);
    } catch {
      return this.http.get<T>(url);
    }
  }
}
