import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { SCL90_QUESTIONS, SCL90_OPTIONS } from "@/lib/assessments/scl90";
import { MBTI_QUESTIONS, MBTI_DIMENSIONS, MBTI_ANSWER_OPTIONS } from "@/lib/assessments/mbti";
import { getMBTIDedupedBank, getMBTIModeInstruction, MBTIMode } from "@/lib/assessments/mbti_banks";
import { SDS_QUESTIONS, SDS_OPTIONS } from "@/lib/assessments/sds";
import { SAS_QUESTIONS } from "@/lib/assessments/sas";

// 获取测评题目
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const normalizedType = type === 'SDS/SAS' ? 'SDS' : type;
    const mode = (searchParams.get('mode') as MBTIMode | null) || null;

    if (normalizedType === 'SCL90') {
      return NextResponse.json({
        questions: SCL90_QUESTIONS,
        options: SCL90_OPTIONS,
        instruction: "请根据您最近一周内（包括今天）的实际感受，选择最符合您情况的答案。请诚实作答，这将有助于更好地了解您的心理状态。"
      });
    } else if (normalizedType === 'MBTI') {
      // 新版：统一使用去重后的AB题库；支持"quick"（随机60题）与"pro"（完整）
      const fullBank = getMBTIDedupedBank();
      if (!fullBank.length) {
        return NextResponse.json({ error: "题库载入失败" }, { status: 500 });
      }
      let questions = fullBank;
      if (mode === 'quick') {
        // 随机抽取60题
        const shuffled = [...fullBank].sort(() => Math.random() - 0.5);
        questions = shuffled.slice(0, Math.min(60, shuffled.length));
      }
      return NextResponse.json({
        questions,
        dimensions: MBTI_DIMENSIONS,
        instruction: getMBTIModeInstruction(mode || 'pro')
      });
    } else if (normalizedType === 'SDS') {
      // 融合SDS（抑郁）与SAS（焦虑）为一个综合问卷，共40题；统一使用SDS/SAS四级频度选项
      const questions = [...SDS_QUESTIONS, ...SAS_QUESTIONS];
      return NextResponse.json({
        questions,
        options: SDS_OPTIONS,
        instruction: "本测评融合SDS抑郁自评与SAS焦虑自评，共40题。请回顾过去一周（含今日）的实际情况，选择最符合您出现频度的选项。部分条目为正向陈述，请按直觉如实作答。"
      });
    } else {
      return NextResponse.json({ error: "无效的测评类型" }, { status: 400 });
    }

  } catch (error) {
    console.error('获取测评题目失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 为MBTI问题生成选项
function getMBTIOptions(questionId: string) {
  return MBTI_ANSWER_OPTIONS[questionId] || { A: "选项A", B: "选项B" };
}
