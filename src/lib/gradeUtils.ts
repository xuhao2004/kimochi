/**
 * 从班级名称中提取年级信息
 * 例如：英教2304班 -> 2023级
 *      行政2201班 -> 2022级  
 *      化工2004班 -> 2020级
 */
export function extractGradeFromClassName(className: string): string | null {
  if (!className) return null;
  
  // 匹配4位数字的年级信息，通常在班级名称中间
  const match = className.match(/(\d{4})/);
  if (!match) return null;
  
  const yearCode = match[1];
  // 将4位年级代码转换为入学年份
  // 例如：2304 -> 2023, 2201 -> 2022, 2004 -> 2020
  const year = parseInt(yearCode.substring(0, 2));
  const century = Math.floor(parseInt(yearCode) / 100);
  
  // 处理世纪转换
  let fullYear: number;
  if (century >= 20) {
    fullYear = 2000 + century;
  } else {
    // 对于小于20的情况，假设是21世纪
    fullYear = 2000 + century;
  }
  
  // 如果年份看起来不合理（太早或太晚），尝试另一种解析方式
  const currentYear = new Date().getFullYear();
  if (fullYear < 2000 || fullYear > currentYear + 10) {
    // 尝试直接取前两位作为20xx年
    const altYear = 2000 + parseInt(yearCode.substring(0, 2));
    if (altYear >= 2000 && altYear <= currentYear + 10) {
      fullYear = altYear;
    } else {
      return null;
    }
  }
  
  return `${fullYear}级`;
}

/**
 * 根据学院、专业、年级对学生进行分组
 */
export interface StudentGroup {
  groupType: 'college' | 'major' | 'grade';
  groupName: string;
  parentGroup?: string;
  users: any[];
  subGroups?: StudentGroup[];
}

export function groupStudentsByHierarchy(students: any[]): StudentGroup[] {
  // 按年级分组
  const gradeGroups = new Map<string, any[]>();
  
  students.forEach(student => {
    const grade = extractGradeFromClassName(student.className) || '未知年级';
    if (!gradeGroups.has(grade)) {
      gradeGroups.set(grade, []);
    }
    gradeGroups.get(grade)!.push(student);
  });
  
  const result: StudentGroup[] = [];
  
  // 为每个年级创建分组结构
  gradeGroups.forEach((gradeStudents, gradeName) => {
    // 按学院分组
    const collegeGroups = new Map<string, any[]>();
    gradeStudents.forEach(student => {
      const college = student.college || '未分配学院';
      if (!collegeGroups.has(college)) {
        collegeGroups.set(college, []);
      }
      collegeGroups.get(college)!.push(student);
    });
    
    const collegeSubGroups: StudentGroup[] = [];
    
    // 为每个学院创建专业分组
    collegeGroups.forEach((collegeStudents, collegeName) => {
      // 按专业分组
      const majorGroups = new Map<string, any[]>();
      collegeStudents.forEach(student => {
        const major = student.major || '未分配专业';
        if (!majorGroups.has(major)) {
          majorGroups.set(major, []);
        }
        majorGroups.get(major)!.push(student);
      });
      
      const majorSubGroups: StudentGroup[] = [];
      
      // 为每个专业创建班级分组
      majorGroups.forEach((majorStudents, majorName) => {
        // 按班级分组
        const classGroups = new Map<string, any[]>();
        majorStudents.forEach(student => {
          const className = student.className || '未分配班级';
          if (!classGroups.has(className)) {
            classGroups.set(className, []);
          }
          classGroups.get(className)!.push(student);
        });
        
        const classSubGroups: StudentGroup[] = [];
        classGroups.forEach((classStudents, className) => {
          classSubGroups.push({
            groupType: 'grade', // 重用类型，表示最底层
            groupName: className,
            parentGroup: majorName,
            users: classStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'))
          });
        });
        
        // 按班级名称排序
        classSubGroups.sort((a, b) => a.groupName.localeCompare(b.groupName, 'zh-CN'));
        
        majorSubGroups.push({
          groupType: 'major',
          groupName: majorName,
          parentGroup: collegeName,
          users: [],
          subGroups: classSubGroups
        });
      });
      
      // 按专业名称排序
      majorSubGroups.sort((a, b) => a.groupName.localeCompare(b.groupName, 'zh-CN'));
      
      collegeSubGroups.push({
        groupType: 'college',
        groupName: collegeName,
        parentGroup: gradeName,
        users: [],
        subGroups: majorSubGroups
      });
    });
    
    // 按学院名称排序
    collegeSubGroups.sort((a, b) => a.groupName.localeCompare(b.groupName, 'zh-CN'));
    
    result.push({
      groupType: 'grade',
      groupName: gradeName,
      users: [],
      subGroups: collegeSubGroups
    });
  });
  
  // 按年级排序（最新的在前）
  result.sort((a, b) => b.groupName.localeCompare(a.groupName, 'zh-CN'));
  
  return result;
}
