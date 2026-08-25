import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { FormDesignerComponent } from './form-designer/form-designer.component';

@NgModule({
  declarations: [AppComponent, FormDesignerComponent],
  imports: [BrowserModule, BrowserAnimationsModule, CommonModule, FormsModule, HttpClientModule, DragDropModule],
  bootstrap: [AppComponent]
})
export class AppModule {}
