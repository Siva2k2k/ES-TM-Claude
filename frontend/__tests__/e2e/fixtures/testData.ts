export interface TestTimesheet {
  weekStart: string;
  entries: TestTimeEntry[];
}

export interface TestTimeEntry {
  project: string;
  task: string;
  date: string;
  hours: number;
  description: string;
  isBillable: boolean;
}

export class TestDataFactory {
  static createWeeklyTimesheet(weekOffset = 0): TestTimesheet {
    const monday = this.getMonday(weekOffset);
    const weekStart = monday.toISOString().split('T')[0];

    return {
      weekStart,
      entries: [
        {
          project: 'E-commerce Platform',
          task: 'Frontend Development',
          date: monday.toISOString().split('T')[0],
          hours: 8,
          description: 'Implemented user authentication',
          isBillable: true
        },
        {
          project: 'E-commerce Platform',
          task: 'Backend Development',
          date: new Date(monday.getTime() + 24*60*60*1000).toISOString().split('T')[0],
          hours: 7,
          description: 'API endpoint optimization',
          isBillable: true
        },
        {
          project: 'Hibiz Fire chat',
          task: 'Frontend Development',
          date: new Date(monday.getTime() + 2*24*60*60*1000).toISOString().split('T')[0],
          hours: 6,
          description: 'Updated project UI',
          isBillable: false
        }
      ]
    };
  }

  static createInvalidTimesheet(): TestTimesheet {
    const monday = this.getMonday(0);
    return {
      weekStart: monday.toISOString().split('T')[0],
      entries: [
        {
          project: 'E-commerce Platform',
          task: 'Frontend Development',
          date: monday.toISOString().split('T')[0],
          hours: 15,
          description: 'Too many hours',
          isBillable: true
        }
      ]
    };
  }

  private static getMonday(weekOffset: number): Date {
    const today = new Date();
    const day = today.getDay();
    const diff = (day === 0 ? -6 : 1 - day) + (weekOffset * 7);
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return monday;
  }
}
