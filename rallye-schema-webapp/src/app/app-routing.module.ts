import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { HomeComponent } from './home/home.component';


const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  // { path: 'login', component: LoginComponent },
  { path: 'adminUsers', component: AdminUsersComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
