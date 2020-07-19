import { Component, OnInit, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle-switch',
  templateUrl: './toggle-switch.component.html',
  styleUrls: ['./toggle-switch.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleSwitchComponent),
      multi: true
    }
  ]
})
export class ToggleSwitchComponent implements OnInit, ControlValueAccessor {
  @Input()
  set checked(v: boolean) {
    this._checked = v;
    this.onChange(this._checked)
  }

  get checked() {
    return this._checked;
  }
  _checked: boolean;

  @Input()
  set disabled(v: boolean) {
    this._disabled = v;
  }

  get disabled() {
    return this._disabled;
  }
  _disabled = false;

  @Input() light = false;

  // Function to call when the rating changes.
  onChange = (checked: boolean) => { };
  // Function to call when the input is touched (when a star is clicked).
  onTouched = () => { };

  constructor() { }

  ngOnInit(): void {
  }

  // Allows Angular to update the model (rating).
  // Update the model and changes needed for the view here.
  writeValue(checked: boolean): void {
    this.checked = checked;
  }
  // Allows Angular to register a function to call when the model (rating) changes.
  // Save the function as a property to call later here.
  registerOnChange(fn: (checked: boolean) => void): void {
    this.onChange = fn;
  }
  // Allows Angular to register a function to call when the input has been touched.
  // Save the function as a property to call later here.
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  // Allows Angular to disable the input.
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
