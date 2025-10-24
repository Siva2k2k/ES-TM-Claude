// Mock date script for frontend development

(function () {
  "use strict";

  const mockDate = import.meta.env.VITE_MOCK_DATE;;
  const mockTZ = import.meta.env.VITE_MOCK_TZ;
  const OriginalDate = Date;

  class MockDate extends OriginalDate {
    constructor(...args) {
      super();
      if (args.length === 0) {
        const mockTime = new OriginalDate(mockDate);
        this.setTime(mockTime.getTime());
      } else {
        const dateTime = new OriginalDate(...args);
        this.setTime(dateTime.getTime());
      }
    }

    static now() {
      return new OriginalDate(mockDate).getTime();
    }

    static parse(str) {
      return OriginalDate.parse(str);
    }

    static UTC(...args) {
      return OriginalDate.UTC(...args);
    }
  }

  // Override Date globally
  globalThis.Date = MockDate;

  // Mock timezone
  const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  Intl.DateTimeFormat.prototype.resolvedOptions = function () {
    const options = originalResolvedOptions.call(this);
    return { ...options, timeZone: mockTZ };
  };

  console.log("[🕓 Frontend Mock Active]", mockDate, mockTZ);
})();
