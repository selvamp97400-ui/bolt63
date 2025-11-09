export const parseBookingAmount = (amount: any): number => {
  if (!amount) return 0;

  let numericString = String(amount);

  numericString = numericString.replace(/[$₹€£¥]/g, '').trim();

  numericString = numericString.replace(/[^0-9.]/g, '');

  const parsed = parseFloat(numericString);

  return isNaN(parsed) ? 0 : parsed;
};

export const isValidBookingDate = (dateString: any): boolean => {
  if (!dateString) return false;

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return false;

  const now = new Date();
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(now.getFullYear() + 2);

  return date <= maxFutureDate;
};

export const getBookingDate = (booking: any): Date | null => {
  const dateSource = booking.date || booking.createdAt || booking.timestamp;

  if (!isValidBookingDate(dateSource)) {
    return null;
  }

  return new Date(dateSource);
};

export const isBookingInMonth = (booking: any, month: number, year: number): boolean => {
  const bookingDate = getBookingDate(booking);

  if (!bookingDate) return false;

  return bookingDate.getMonth() === month && bookingDate.getFullYear() === year;
};

export const normalizeBookingStatus = (status: any): string => {
  if (!status) return '';

  return String(status).toLowerCase().trim();
};

export const isCompletedBooking = (booking: any): boolean => {
  const normalizedStatus = normalizeBookingStatus(booking.status);

  return normalizedStatus === 'completed';
};

export const calculateRevenueForBookings = (bookings: any[]): number => {
  return bookings
    .filter(isCompletedBooking)
    .reduce((sum: number, booking: any) => {
      const amount = parseBookingAmount(booking.amount);
      return sum + amount;
    }, 0);
};

export const getBookingsForMonth = (bookings: any[], month: number, year: number): any[] => {
  return bookings.filter((booking) => isBookingInMonth(booking, month, year));
};
