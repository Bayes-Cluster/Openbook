/**
 * 统一时间处理工具类
 * 
 * 策略：
 * 1. 服务器存储和计算都使用 UTC 时间
 * 2. 前端显示使用用户本地时区
 * 3. API 传输使用 ISO 8601 格式
 * 4. 日历操作基于本地时区，发送时转换为 UTC
 */

export class TimeUtils {
  /**
   * 将本地时间转换为 UTC ISO 字符串（用于 API 传输）
   * @param date 本地时间
   * @returns UTC ISO 字符串
   */
  static toUTCISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * 将 UTC ISO 字符串转换为本地时间
   * @param isoString UTC ISO 字符串
   * @returns 本地时间
   */
  static fromUTCISOString(isoString: string): Date {
    return new Date(isoString);
  }

  /**
   * 创建本地日期时间（用于日历操作）
   * @param year 年
   * @param month 月（0-11）
   * @param date 日
   * @param hours 时
   * @param minutes 分
   * @param seconds 秒
   * @returns 本地时间
   */
  static createLocalDateTime(
    year: number,
    month: number,
    date: number,
    hours: number = 0,
    minutes: number = 0,
    seconds: number = 0
  ): Date {
    return new Date(year, month, date, hours, minutes, seconds);
  }

  /**
   * 获取日期的开始时间（当天00:00:00）
   * @param date 基准日期
   * @returns 当天开始时间
   */
  static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * 获取日期的结束时间（当天23:59:59）
   * @param date 基准日期
   * @returns 当天结束时间
   */
  static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * 设置日期的时间部分
   * @param date 基准日期
   * @param hours 时
   * @param minutes 分
   * @param seconds 秒
   * @returns 新的日期时间
   */
  static setTime(date: Date, hours: number, minutes: number = 0, seconds: number = 0): Date {
    const result = new Date(date);
    result.setHours(hours, minutes, seconds, 0);
    return result;
  }

  /**
   * 格式化显示时间（本地化）
   * @param date 时间
   * @param options 格式化选项
   * @returns 格式化的时间字符串
   */
  static formatDisplayTime(
    date: Date,
    options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
  ): string {
    return date.toLocaleString('zh-CN', options);
  }

  /**
   * 格式化为日期字符串
   * @param date 时间
   * @returns 日期字符串（YYYY-MM-DD）
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
  }

  /**
   * 格式化为时间字符串
   * @param date 时间
   * @returns 时间字符串（HH:MM）
   */
  static formatTime(date: Date): string {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * 将时间转换为 datetime-local 输入格式
   * @param date 时间
   * @returns datetime-local 格式字符串
   */
  static toDateTimeLocalString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * 从 datetime-local 字符串创建时间
   * @param dateTimeLocalString datetime-local 格式字符串
   * @returns 本地时间
   */
  static fromDateTimeLocalString(dateTimeLocalString: string): Date {
    return new Date(dateTimeLocalString);
  }

  /**
   * 检查两个时间段是否有冲突
   * @param start1 时间段1开始时间
   * @param end1 时间段1结束时间
   * @param start2 时间段2开始时间
   * @param end2 时间段2结束时间
   * @returns 是否有冲突
   */
  static hasTimeConflict(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * 获取周的开始日期（周一）
   * @param date 基准日期
   * @returns 该周周一的日期
   */
  static getWeekStart(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
    result.setDate(diff);
    return this.startOfDay(result);
  }

  /**
   * 获取周的结束日期（周日）
   * @param date 基准日期
   * @returns 该周周日的日期
   */
  static getWeekEnd(date: Date): Date {
    const weekStart = this.getWeekStart(date);
    const result = new Date(weekStart);
    result.setDate(weekStart.getDate() + 6);
    return this.endOfDay(result);
  }

  /**
   * 获取周的所有日期
   * @param date 基准日期
   * @returns 该周的7天日期数组（周一到周日）
   */
  static getWeekDays(date: Date): Date[] {
    const weekStart = this.getWeekStart(date);
    const days: Date[] = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    
    return days;
  }

  /**
   * 比较两个日期是否是同一天
   * @param date1 日期1
   * @param date2 日期2
   * @returns 是否是同一天
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * 获取当前时间
   * @returns 当前本地时间
   */
  static now(): Date {
    return new Date();
  }

  /**
   * 获取今天的日期
   * @returns 今天的日期（时间部分为00:00:00）
   */
  static today(): Date {
    return this.startOfDay(new Date());
  }

  /**
   * 获取用户时区信息
   * @returns 时区缩写和偏移信息
   */
  static getTimezoneInfo(): { name: string; offset: string; fullName: string } {
    const now = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // 获取时区偏移
    const offsetMinutes = now.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    const offset = `UTC${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`;
    
    // 获取时区简称
    const shortName = now.toLocaleDateString('en', { timeZoneName: 'short' }).split(', ')[1] || timeZone.split('/').pop() || 'Local';
    
    return {
      name: shortName,
      offset: offset,
      fullName: timeZone
    };
  }

  /**
   * 格式化显示时间（包含时区）
   * @param date 时间
   * @param showTimezone 是否显示时区
   * @returns 格式化的时间字符串
   */
  static formatDisplayTimeWithTimezone(date: Date, showTimezone: boolean = true): string {
    const timeStr = this.formatDisplayTime(date);
    if (!showTimezone) return timeStr;
    
    const tz = this.getTimezoneInfo();
    return `${timeStr} ${tz.name}`;
  }

  /**
   * 计算时间差并格式化为倒计时
   * @param targetTime 目标时间
   * @param currentTime 当前时间（可选，默认为现在）
   * @returns 倒计时字符串
   */
  static formatCountdown(targetTime: Date, currentTime: Date = new Date()): string {
    const diffMs = targetTime.getTime() - currentTime.getTime();
    
    if (diffMs <= 0) {
      return '已过期';
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      return `${diffDays}天${remainingHours}小时`;
    } else if (diffHours > 0) {
      const remainingMinutes = diffMinutes % 60;
      return `${diffHours}小时${remainingMinutes}分钟`;
    } else if (diffMinutes > 0) {
      const remainingSeconds = diffSeconds % 60;
      return `${diffMinutes}分钟${remainingSeconds}秒`;
    } else {
      return `${diffSeconds}秒`;
    }
  }

  /**
   * 查找下一个即将开始的任务
   * @param bookings 预约列表
   * @param currentTime 当前时间（可选）
   * @returns 下一个任务或null
   */
  static findNextUpcomingTask(bookings: any[], currentTime: Date = new Date()): any | null {
    const upcomingBookings = bookings
      .filter(booking => booking.startTime > currentTime && booking.isOwn)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    return upcomingBookings.length > 0 ? upcomingBookings[0] : null;
  }
}
