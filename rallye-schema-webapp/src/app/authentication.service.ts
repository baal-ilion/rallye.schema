import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  host = 'http://localhost:8080';
  jwt;
  username;
  roles: Array<string>;

  constructor(private http: HttpClient) {
  }

  login(user) {
    return this.http.post(this.host + '/login', user, { observe: 'response' });
  }

  saveToken(jwt: string) {
    localStorage.setItem('token', jwt);
    this.jwt = jwt;
    this.parseJWT();
  }

  parseJWT() {
    if (this.jwt) {
      const jwtHelper = new JwtHelperService();
      const jwtObject = jwtHelper.decodeToken(this.jwt);
      this.username = jwtObject.sub;
      this.roles = jwtObject.roles;
      console.log('name=' + this.username);
      console.log('admin=' + this.isAdmin());
      console.log('user=' + this.isUser());
    } else {
      this.username = undefined;
      this.roles = undefined;
    }
  }

  isAdmin() {
    return this.roles && this.roles.indexOf('ADMIN') >= 0;
  }

  isUser() {
    return this.roles && this.roles.indexOf('USER') >= 0;
  }

  isAuthenticated() {
    return this.roles && (this.isAdmin() || this.isUser());
  }

  loadToken() {
    this.jwt = localStorage.getItem('token');
    this.parseJWT();
  }

  logout() {
    localStorage.removeItem('token');
    this.jwt = undefined;
    this.parseJWT();
  }
}
