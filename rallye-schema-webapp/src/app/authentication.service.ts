import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', user.username);
    params.append('password', user.password);
    const header = new HttpHeaders({
      'Content-type': 'application/x-www-form-urlencoded; charset=utf-8',
      Authorization: 'Basic ' + btoa('webapp:123456')
    });

    return this.http.post(this.host + '/oauth/token', params.toString(), { headers: header });
  }

  saveToken(jwt: string) {
    localStorage.setItem('token', jwt);
    this.jwt = jwt;
    this.parseJWT();
  }

  parseJWT() {
    if (this.jwt) {
      console.log(this.jwt);
      const jwtHelper = new JwtHelperService();
      const jwtObject = jwtHelper.decodeToken(this.jwt);
      console.log(jwtObject);
      this.username = jwtObject.user_name;
      this.roles = jwtObject.authorities;
      console.log('name=' + this.username);
      console.log('roles=' + this.roles);
      console.log('admin=' + this.isAdmin());
      console.log('user=' + this.isUser());
    } else {
      this.username = undefined;
      this.roles = undefined;
    }
  }

  isAdmin() {
    return this.roles && this.roles.indexOf('ROLE_ADMIN') >= 0;
  }

  isUser() {
    return this.roles && this.roles.indexOf('ROLE_USER') >= 0;
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
