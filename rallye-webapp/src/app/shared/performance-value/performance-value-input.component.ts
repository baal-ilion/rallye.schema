import { Component, forwardRef, Input, OnChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PerformanceValueFormat } from '../../configuration/models/performance-scoring';

@Component({
  selector: 'app-performance-value-input',
  templateUrl: './performance-value-input.component.html',
  styleUrls: ['./performance-value-input.component.scss'],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PerformanceValueInputComponent), multi: true }]
})
export class PerformanceValueInputComponent implements ControlValueAccessor, OnChanges {
  @Input() format: PerformanceValueFormat = PerformanceValueFormat.DECIMAL;
  @Input() decimalPlaces = 2;
  @Input() unit = '';
  value: number | null = null;
  first = 0;
  second = 0;
  third = 0;
  disabled = false;
  readonly formats = PerformanceValueFormat;
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  get segmented(): boolean {
    return ![PerformanceValueFormat.INTEGER, PerformanceValueFormat.DECIMAL].includes(this.format);
  }
  get numberStep(): number {
    return this.format === PerformanceValueFormat.INTEGER ? 1 : Math.pow(10, -this.decimalPlaces);
  }
  get hasThird(): boolean {
    return [PerformanceValueFormat.DURATION_HOURS_MINUTES_SECONDS,
      PerformanceValueFormat.ANGLE_DEGREES_MINUTES_SECONDS].includes(this.format);
  }
  get firstSymbol(): string {
    return this.format.startsWith('ANGLE_') ? '°' :
      this.format === PerformanceValueFormat.DURATION_MINUTES_SECONDS ? '′' : 'h';
  }
  get secondSymbol(): string {
    return this.format === PerformanceValueFormat.DURATION_MINUTES_SECONDS ? '″' : '′';
  }

  ngOnChanges(): void { this.fromCanonical(); }
  writeValue(value: number | null): void { this.value = value; this.fromCanonical(); }
  registerOnChange(fn: (value: number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  updateNumber(raw: string): void {
    const parsed = raw === '' ? null : Number(raw.replace(',', '.'));
    this.value = parsed !== null && Number.isFinite(parsed) ? parsed : null;
    this.emit();
  }

  updateSegments(): void {
    this.second = Math.max(0, Math.min(59, this.second || 0));
    this.third = Math.max(0, Math.min(59, this.third || 0));
    if (this.format.startsWith('ANGLE_')) {
      const sign = this.first < 0 ? -1 : 1;
      this.value = sign * (Math.abs(this.first) + this.second / 60 + (this.hasThird ? this.third / 3600 : 0));
    } else if (this.format === PerformanceValueFormat.DURATION_MINUTES_SECONDS) {
      this.value = this.first * 60 + this.second;
    } else if (this.format === PerformanceValueFormat.DURATION_HOURS_MINUTES) {
      this.value = this.first * 3600 + this.second * 60;
    } else {
      this.value = this.first * 3600 + this.second * 60 + this.third;
    }
    this.emit();
  }

  touch(): void { this.onTouched(); }

  private emit(): void { this.onChange(this.value); this.onTouched(); }
  private fromCanonical(): void {
    const value = this.value ?? 0;
    if (this.format.startsWith('ANGLE_')) {
      const sign = value < 0 ? -1 : 1;
      const absolute = Math.abs(value);
      this.first = sign * Math.floor(absolute);
      this.second = Math.floor((absolute - Math.floor(absolute)) * 60);
      this.third = Math.round((((absolute - Math.floor(absolute)) * 60) - this.second) * 60);
    } else if (this.format === PerformanceValueFormat.DURATION_MINUTES_SECONDS) {
      this.first = Math.floor(value / 60); this.second = Math.round(value % 60); this.third = 0;
    } else {
      this.first = Math.floor(value / 3600);
      this.second = Math.floor(value % 3600 / 60);
      this.third = Math.round(value % 60);
    }
  }
}
