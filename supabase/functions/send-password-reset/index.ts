import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, locale = 'en' } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Generate a recovery token
    const { data, error } = await supabaseClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        // Custom redirect URL based on locale
        redirectTo: `${Deno.env.get('SITE_URL') || 'http://localhost:3000'}/${locale}/auth/reset-password`
      }
    })

    if (error) {
      throw error
    }

    // Get user info for personalization
    const { data: userData } = await supabaseClient
      .from('user_profiles')
      .select('display_name')
      .eq('id', data.user.id)
      .single()

    const userName = userData?.display_name || email.split('@')[0]
    const recoveryLink = data.properties.action_link

    // Custom email template
    const emailSubject = locale === 'zh' 
      ? '重置您的 VetSphere 密码'
      : locale === 'ja'
      ? 'VetSphere パスワードのリセット'
      : locale === 'th'
      ? 'รีเซ็ตรหัสผ่าน VetSphere ของคุณ'
      : 'Reset Your VetSphere Password'

    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailSubject}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 40px 20px;">
          <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">VetSphere</h1>
                <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                  ${locale === 'zh' ? '全球兽医知识共享平台' : locale === 'ja' ? 'グローバル獣医知識共有プラットフォーム' : locale === 'th' ? 'แพลตฟอร์มแบ่งปันความรู้สัตวแพทย์ระดับโลก' : 'Global Veterinary Knowledge Platform'}
                </p>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                  ${locale === 'zh' ? '重置密码' : locale === 'ja' ? 'パスワードのリセット' : locale === 'th' ? 'รีเซ็ตรหัสผ่าน' : 'Reset Your Password'}
                </h2>
                
                <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                  ${locale === 'zh' ? `你好，${userName}！` : locale === 'ja' ? `こんにちは、${userName}さん！` : locale === 'th' ? `สวัสดี ${userName}` : `Hello ${userName}!`}
                </p>
                
                <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                  ${locale === 'zh' 
                    ? '我们收到了重置您 VetSphere 账户密码的请求。点击下方按钮即可设置新密码：' 
                    : locale === 'ja'
                    ? 'VetSphere アカウントのパスワードリセットがリクエストされました。下のボタンをクリックして新しいパスワードを設定してください：'
                    : locale === 'th'
                    ? 'มีคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี VetSphere ของคุณ คลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:'
                    : 'We received a request to reset your VetSphere account password. Click the button below to set a new password:'}
                </p>
                
                <!-- CTA Button -->
                <table role="presentation" style="margin: 30px 0; border-collapse: collapse;">
                  <tr>
                    <td style="border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                      <a href="${recoveryLink}" 
                         style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                        ${locale === 'zh' ? '重置密码' : locale === 'ja' ? 'パスワードをリセット' : locale === 'th' ? 'รีเซ็ตรหัสผ่าน' : 'Reset Password'}
                      </a>
                    </td>
                  </tr>
                </table>
                
                <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                  ${locale === 'zh' 
                    ? '如果按钮无法点击，您可以复制以下链接到浏览器中打开：' 
                    : locale === 'ja'
                    ? 'ボタンがクリックできない場合は、以下のリンクをコピーしてブラウザに貼り付けてください：'
                    : locale === 'th'
                    ? 'หากปุ่มไม่สามารถคลิกได้ คุณสามารถคัดลอกลิงก์ด้านล่างและวางในเบราว์เซอร์:'
                    : 'If the button above doesn\'t work, copy and paste the link below into your browser:'}
                </p>
                
                <p style="margin: 12px 0 0 0; color: #667eea; font-size: 14px; word-break: break-all;">
                  <a href="${recoveryLink}" style="color: #667eea; text-decoration: none;">${recoveryLink}</a>
                </p>
                
                <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                  ${locale === 'zh' 
                    ? '为了您的账户安全，请勿将此链接分享给他人。此链接将在 1 小时后过期。' 
                    : locale === 'ja'
                    ? 'アカウントのセキュリティのため、このリンクを第三者と共有しないでください。このリンクは 1 時間後に無効になります。'
                    : locale === 'th'
                    ? 'เพื่อความปลอดภัยของบัญชีของคุณ โปรดไม่แชร์ลิงก์นี้กับผู้อื่น ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง'
                    : 'For your security, please do not share this link with anyone. The link will expire in 1 hour.'}
                </p>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; text-align: center;">
                  ${locale === 'zh' ? 'VetSphere 团队' : locale === 'ja' ? 'VetSphere チーム' : locale === 'th' ? 'ทีม VetSphere' : 'The VetSphere Team'}
                </p>
                <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                  ${locale === 'zh' 
                    ? '© 2026 VetSphere. 保留所有权利。' 
                    : locale === 'ja'
                    ? '© 2026 VetSphere. All rights reserved.'
                    : locale === 'th'
                    ? '© 2026 VetSphere. สงวนลิขสิทธิ์.'
                    : '© 2026 VetSphere. All rights reserved.'}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `.trim()

    const emailText = `
${locale === 'zh' ? '重置您的 VetSphere 密码' : locale === 'ja' ? 'VetSphere パスワードのリセット' : locale === 'th' ? 'รีเซ็ตรหัสผ่าน VetSphere' : 'Reset Your VetSphere Password'}

${locale === 'zh' ? `你好，${userName}！` : locale === 'ja' ? `こんにちは、${userName}さん！` : locale === 'th' ? `สวัสดี ${userName}` : `Hello ${userName}!`}

${locale === 'zh' 
  ? '我们收到了重置您 VetSphere 账户密码的请求。点击下方链接即可设置新密码：' 
  : locale === 'ja'
  ? 'VetSphere アカウントのパスワードリセットがリクエストされました。以下のリンクをクリックして新しいパスワードを設定してください：'
  : locale === 'th'
  ? 'มีคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี VetSphere ของคุณ คลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:'
  : 'We received a request to reset your VetSphere account password. Click the link below to set a new password:'}

${recoveryLink}

${locale === 'zh' 
  ? '为了您的账户安全，请勿将此链接分享给他人。此链接将在 1 小时后过期。' 
  : locale === 'ja'
  ? 'アカウントのセキュリティのため、このリンクを第三者と共有しないでください。このリンクは 1 時間後に無効になります。'
  : locale === 'th'
  ? 'เพื่อความปลอดภัยของบัญชีของคุณ โปรดไม่แชร์ลิงก์นี้กับผู้อื่น ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง'
  : 'For your security, please do not share this link with anyone. The link will expire in 1 hour.'}

${locale === 'zh' ? 'VetSphere 团队' : locale === 'ja' ? 'VetSphere チーム' : locale === 'th' ? 'ทีม VetSphere' : 'The VetSphere Team'}
    `.trim()

    // Send email using Supabase
    const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
      body: {
        to: email,
        subject: emailSubject,
        html: emailHtml,
        text: emailText
      }
    })

    if (emailError) {
      throw emailError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset email sent successfully',
        // In development, also return the link for testing
        ...(Deno.env.get('SUPABASE_ENVIRONMENT') === 'local' ? { recoveryLink } : {})
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Password reset error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
