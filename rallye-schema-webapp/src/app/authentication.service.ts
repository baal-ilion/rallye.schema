import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import { OAuthService } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  host = 'http://localhost:8080';//1/spring-security-oauth-server';

  constructor(private http: HttpClient, private oauthService: OAuthService, private router: Router) {
    this.oauthService.configure({
      loginUrl: this.host + '/oauth/authorize',
      redirectUri: 'http://localhost:4200/',
      clientId: 'webapp',
      scope: 'read write',
      oidc: false
    });
    this.oauthService.setStorage(sessionStorage);
    this.oauthService.tryLogin({});
    this.oauthService.setupAutomaticSilentRefresh();
  }

  obtainAccessToken() {
    this.oauthService.initImplicitFlow();
  }

  isLoggedIn() {
    console.log(this.oauthService.getAccessToken());
    if (this.oauthService.getAccessToken() === null) {
      return false;
    }
    return true;
  }

  logout() {
    this.oauthService.logOut();
  }

  isAdmin() {
    let jwt = this.oauthService.getAccessToken();
    //console.log(jwt);
    if (jwt === null) {
      return false;
    }
    const jwtHelper = new JwtHelperService();
    const jwtObject = jwtHelper.decodeToken(jwt);
    //console.log(jwtObject);
    return jwtObject.authorities && jwtObject.authorities.indexOf('ROLE_ADMIN') >= 0;
  }

  isUser() {
    let jwt = this.oauthService.getAccessToken();
    //console.log(jwt);
    if (jwt === null) {
      return false;
    }
    const jwtHelper = new JwtHelperService();
    const jwtObject = jwtHelper.decodeToken(jwt);
    //console.log(jwtObject);
    return jwtObject.authorities && jwtObject.authorities.indexOf('ROLE_USER') >= 0;
  }

  username() {
    let jwt = this.oauthService.getAccessToken();
    //console.log(jwt);
    if (jwt === null) {
      return null;
    }
    const jwtHelper = new JwtHelperService();
    const jwtObject = jwtHelper.decodeToken(jwt);
    return jwtObject.user_name;
  }

  getResource(resourceUrl) {
    const httpheaders = new HttpHeaders({
      Authorization: 'Bearer ' + this.oauthService.getAccessToken()
    });
    return this.http.get(resourceUrl, { headers: httpheaders });
  }

  deleteResource(url) {
    const headers = new HttpHeaders({
      'Content-type': 'application/x-www-form-urlencoded; charset=utf-8',
      Authorization: 'Bearer ' + this.oauthService.getAccessToken()
    });
    return this.http.delete(url, { headers });
  }

  postResource(url, value) {
    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + this.oauthService.getAccessToken()
    });
    return this.http.post(url, value, { headers });
  }

  patchResource(url, value) {
    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + this.oauthService.getAccessToken()
    });
    return this.http.patch(url, value, { headers });
  }

}
