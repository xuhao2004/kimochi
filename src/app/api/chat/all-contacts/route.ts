import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { groupStudentsByHierarchy } from "@/lib/gradeUtils";

// 计算用户在线状态的辅助函数
function calculateOnlineStatus(lastActiveAt: Date): boolean {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  return lastActiveAt > fiveMinutesAgo;
}

// 获取所有可联系的用户，按角色和年级班级分组
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { 
        id: true, 
        accountType: true, 
        isAdmin: true,
        isSuperAdmin: true,
        className: true,
        name: true 
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    let contacts: any[] = [];
    
    // 获取用户的好友关系
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: payload.sub, status: "accepted" },
          { friendId: payload.sub, status: "accepted" }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profileImage: true,
            gender: true,
            zodiac: true,
            accountType: true,
            isAdmin: true,
            isSuperAdmin: true,
            className: true,
            college: true,
            major: true,
            office: true,
            phone: true,
            lastActiveAt: true
          }
        },
        friend: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profileImage: true,
            gender: true,
            zodiac: true,
            accountType: true,
            isAdmin: true,
            isSuperAdmin: true,
            className: true,
            college: true,
            major: true,
            office: true,
            phone: true,
            lastActiveAt: true
          }
        },
        group: true
      }
    });

    // 获取用户的自定义分组
    const userGroups = await prisma.friendGroup.findMany({
      where: { userId: payload.sub },
      orderBy: { order: 'asc' }
    });

    // 根据用户类型获取默认联系人（无需好友关系）
    const defaultContacts: any[] = [];
    
    if (currentUser.isSuperAdmin) {
      // 超级管理员：可以看到所有用户
      const allUsers = await prisma.user.findMany({
        where: { id: { not: currentUser.id } },
        select: {
          id: true,
          name: true,
          nickname: true,
          profileImage: true,
          gender: true,
          zodiac: true,
          accountType: true,
          isAdmin: true,
          isSuperAdmin: true,
          className: true,
          college: true,
          major: true,
          office: true,
          phone: true,
          lastActiveAt: true
        },
        orderBy: [
          { isSuperAdmin: 'desc' },
          { isAdmin: 'desc' },
          { accountType: 'asc' },
          { name: 'asc' }
        ]
      });

      // 按用户类型分组
      const superAdmins = allUsers.filter(u => u.isSuperAdmin).map(u => ({
        ...u,
        isOnline: calculateOnlineStatus(u.lastActiveAt)
      }));
      const teachers = allUsers.filter(u => u.accountType === 'teacher' && !u.isSuperAdmin).map(u => ({
        ...u,
        isOnline: calculateOnlineStatus(u.lastActiveAt)
      }));
      const students = allUsers.filter(u => u.accountType === 'student');
      const selfUsers = allUsers.filter(u => u.accountType === 'self').map(u => ({
        ...u,
        isOnline: calculateOnlineStatus(u.lastActiveAt)
      }));

      if (superAdmins.length > 0) {
        defaultContacts.push({
          groupType: 'super_admins',
          groupName: '超级管理员',
          users: superAdmins
        });
      }

      if (teachers.length > 0) {
        defaultContacts.push({
          groupType: 'teachers',
          groupName: '老师',
          users: teachers
        });
      }

      if (students.length > 0) {
        const hierarchicalGroups = groupStudentsByHierarchy(students);
        const addOnlineStatusToHierarchy = (groups: any[]): any[] => {
          return groups.map(group => ({
            ...group,
            users: group.users.map((user: any) => ({
              ...user,
              isOnline: calculateOnlineStatus(user.lastActiveAt)
            })),
            subGroups: group.subGroups ? addOnlineStatusToHierarchy(group.subGroups) : undefined
          }));
        };
        
        defaultContacts.push({
          groupType: 'hierarchical_students',
          groupName: '学生',
          hierarchicalData: addOnlineStatusToHierarchy(hierarchicalGroups)
        });
      }

      if (selfUsers.length > 0) {
        defaultContacts.push({
          groupType: 'self',
          groupName: '注册用户',
          users: selfUsers
        });
      }

    } else if (currentUser.accountType === 'teacher' || currentUser.isAdmin) {
      // 老师：可以看到超级管理员、学生和注册用户
      
      // 获取超级管理员
      const superAdmins = await prisma.user.findMany({
        where: {
          isSuperAdmin: true,
          id: { not: currentUser.id }
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          profileImage: true,
          accountType: true,
          isAdmin: true,
          isSuperAdmin: true,
          className: true,
          college: true,
          major: true,
          office: true,
          phone: true,
          lastActiveAt: true
        },
        orderBy: { name: 'asc' }
      });

      const students = await prisma.user.findMany({
        where: {
          accountType: 'student',
          id: { not: currentUser.id }
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          profileImage: true,
          accountType: true,
          isAdmin: true,
          isSuperAdmin: true,
          className: true,
          college: true,
          major: true,
          office: true,
          phone: true,
          lastActiveAt: true
        },
        orderBy: [
          { college: 'asc' },
          { major: 'asc' },
          { className: 'asc' },
          { name: 'asc' }
        ]
      });

      const selfUsers = await prisma.user.findMany({
        where: {
          accountType: 'self',
          id: { not: currentUser.id }
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          profileImage: true,
          accountType: true,
          isAdmin: true,
          isSuperAdmin: true,
          className: true,
          office: true,
          phone: true,
          lastActiveAt: true
        },
        orderBy: { name: 'asc' }
      });

      // 添加超级管理员分组
      if (superAdmins.length > 0) {
        defaultContacts.push({
          groupType: 'super_admins',
          groupName: '超级管理员',
          users: superAdmins.map(user => ({
            ...user,
            isOnline: calculateOnlineStatus(user.lastActiveAt)
          }))
        });
      }

      if (students.length > 0) {
        const hierarchicalGroups = groupStudentsByHierarchy(students);
        const addOnlineStatusToHierarchy = (groups: any[]): any[] => {
          return groups.map(group => ({
            ...group,
            users: group.users.map((user: any) => ({
              ...user,
              isOnline: calculateOnlineStatus(user.lastActiveAt)
            })),
            subGroups: group.subGroups ? addOnlineStatusToHierarchy(group.subGroups) : undefined
          }));
        };
        
        defaultContacts.push({
          groupType: 'hierarchical_students',
          groupName: '学生',
          hierarchicalData: addOnlineStatusToHierarchy(hierarchicalGroups)
        });
      }

      if (selfUsers.length > 0) {
        defaultContacts.push({
          groupType: 'self',
          groupName: '注册用户',
          users: selfUsers.map(user => ({
            ...user,
            isOnline: calculateOnlineStatus(user.lastActiveAt)
          }))
        });
      }

    } else if (currentUser.accountType === 'student') {
      // 学生：只能看到老师和同班同学（不包括超级管理员）
      const teachers = await prisma.user.findMany({
        where: {
          OR: [
            { accountType: 'teacher' },
            { accountType: 'admin', isSuperAdmin: false } // 排除超级管理员
          ],
          id: { not: currentUser.id }
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          profileImage: true,
          accountType: true,
          isAdmin: true,
          isSuperAdmin: true,
          className: true,
          office: true,
          phone: true,
          lastActiveAt: true
        },
        orderBy: [
          { isAdmin: 'desc' },
          { name: 'asc' }
        ]
      }).then(users => users.map(user => ({
        ...user,
        isOnline: calculateOnlineStatus(user.lastActiveAt)
      })));

      // 同班同学
      const classmates = currentUser.className ? await prisma.user.findMany({
        where: {
          accountType: 'student',
          className: currentUser.className,
          id: { not: currentUser.id }
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          profileImage: true,
          accountType: true,
          isAdmin: true,
          isSuperAdmin: true,
          className: true,
          office: true,
          phone: true,
          lastActiveAt: true
        },
        orderBy: { name: 'asc' }
      }) : [];

      // 添加老师分组（如果有）
      if (teachers.length > 0) {
        defaultContacts.push({
          groupType: 'teachers',
          groupName: '老师',
          users: teachers
        });
      }

      // 添加同班同学分组（如果有）
      if (classmates.length > 0) {
        defaultContacts.push({
          groupType: 'classmates',
          groupName: '同班同学',
          users: classmates.map(classmate => ({
            ...classmate,
            isOnline: calculateOnlineStatus(classmate.lastActiveAt)
          }))
        });
      }

    } else if (currentUser.accountType === 'self') {
      // 注册用户：只能看到心理咨询师（老师），不包含超级管理员
      const counselors = await prisma.user.findMany({
        where: {
          OR: [
            { accountType: 'teacher' },
            { isAdmin: true }
          ],
          isSuperAdmin: false,
          id: { not: currentUser.id }
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          profileImage: true,
          accountType: true,
          isAdmin: true,
          isSuperAdmin: true,
          className: true,
          office: true,
          phone: true,
          lastActiveAt: true
        },
        orderBy: [
          { isAdmin: 'desc' },
          { name: 'asc' }
        ]
      });

      if (counselors.length > 0) {
        defaultContacts.push({
          groupType: 'counselors',
          groupName: '心理咨询师',
          users: counselors.map(counselor => ({
            ...counselor,
            isOnline: calculateOnlineStatus(counselor.lastActiveAt)
          }))
        });
      }
    }

    contacts = [...defaultContacts];

    // 处理好友关系和自定义分组（仅对普通用户）
    if (friendships.length > 0 && !currentUser.isSuperAdmin && currentUser.accountType !== 'teacher' && !currentUser.isAdmin) {
      // 获取好友用户信息
      const friends = friendships.map(friendship => {
        const friend = friendship.userId === payload.sub ? friendship.friend : friendship.user;
        return {
          ...friend,
          isOnline: calculateOnlineStatus(friend.lastActiveAt),
          groupId: friendship.groupId,
          friendshipId: friendship.id
        };
      });

      // 处理分组
      const groupedFriends: { [key: string]: any[] } = {};
      
      // 如果有自定义分组，按分组归类
      if (userGroups.length > 0) {
        userGroups.forEach(group => {
          groupedFriends[group.id] = [];
        });
        groupedFriends['no_group'] = []; // 未分组的好友
      } else {
        groupedFriends['default'] = []; // 默认分组
      }

      // 将好友分配到对应分组
      friends.forEach(friend => {
        if (friend.groupId && groupedFriends[friend.groupId]) {
          groupedFriends[friend.groupId].push(friend);
        } else if (userGroups.length > 0) {
          groupedFriends['no_group'].push(friend);
        } else {
          groupedFriends['default'].push(friend);
        }
      });

      // 将分组转换为联系人格式
      const friendGroups: any[] = [];
      
      if (userGroups.length > 0) {
        userGroups.forEach(group => {
          if (groupedFriends[group.id] && groupedFriends[group.id].length > 0) {
            friendGroups.push({
              groupType: 'friend_group',
              groupName: group.name,
              groupId: group.id,
              isCustomGroup: true,
              users: groupedFriends[group.id]
            });
          }
        });

        // 添加未分组的好友
        if (groupedFriends['no_group'] && groupedFriends['no_group'].length > 0) {
          friendGroups.push({
            groupType: 'friend_group',
            groupName: '我的好友',
            groupId: null,
            isCustomGroup: false,
            users: groupedFriends['no_group']
          });
        }
      } else {
        // 没有自定义分组，使用默认"我的好友"分组
        if (groupedFriends['default'] && groupedFriends['default'].length > 0) {
          friendGroups.push({
            groupType: 'friend_group',
            groupName: '我的好友',
            groupId: null,
            isCustomGroup: false,
            users: groupedFriends['default']
          });
        }
      }

      // 将好友分组添加到联系人列表
      contacts = [...contacts, ...friendGroups];
    }

    return NextResponse.json({ 
      contacts,
      currentUserType: currentUser.accountType
    });

  } catch (error) {
    console.error('获取联系人列表失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
