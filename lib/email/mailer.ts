import { env, isEmailEnabled } from '@/lib/env'
import nodemailer from 'nodemailer'

// Email templates
const ORDER_CONFIRMATION_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - {{ORDER_NUMBER}}</title>
    <style>
        body {
            font-family: 'Helvetica', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 28px;
        }
        .order-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
        }
        .order-info h2 {
            margin-top: 0;
            color: #2c3e50;
        }
        .item {
            border-bottom: 1px solid #e9ecef;
            padding: 15px 0;
        }
        .item:last-child {
            border-bottom: none;
        }
        .item-name {
            font-weight: bold;
            font-size: 16px;
        }
        .item-details {
            color: #6c757d;
            font-size: 14px;
            margin: 5px 0;
        }
        .item-price {
            float: right;
            font-weight: bold;
        }
        .totals {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin-top: 20px;
        }
        .total-line {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
        }
        .total-line.final {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #dee2e6;
            padding-top: 10px;
            margin-top: 10px;
        }
        .shipping-address {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 6px;
            margin-top: 20px;
        }
        .cta {
            text-align: center;
            margin: 30px 0;
        }
        .cta a {
            background: #007bff;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Thank you for your order. Here are the details:</p>
        </div>
        
        <div class="order-info">
            <h2>Order #{{ORDER_NUMBER}}</h2>
            <p><strong>Order Date:</strong> {{ORDER_DATE}}</p>
            <p><strong>Estimated Delivery:</strong> {{ESTIMATED_DELIVERY}}</p>
        </div>

        <h3>Items Ordered:</h3>
        {{ITEMS}}

        <div class="totals">
            <div class="total-line">
                <span>Subtotal:</span>
                <span>${{SUBTOTAL}}</span>
            </div>
            <div class="total-line">
                <span>Shipping:</span>
                <span>{{SHIPPING_DISPLAY}}</span>
            </div>
            <div class="total-line">
                <span>Tax:</span>
                <span>${{TAX}}</span>
            </div>
            <div class="total-line final">
                <span>Total:</span>
                <span>${{TOTAL}}</span>
            </div>
        </div>

        <div class="shipping-address">
            <h3>Shipping Address:</h3>
            <p>{{CUSTOMER_NAME}}<br>
            {{ADDRESS}}<br>
            {{CITY}}, {{STATE}} {{POSTAL_CODE}}<br>
            {{COUNTRY}}</p>
        </div>

        <div class="cta">
            <a href="{{TRACKING_URL}}">Track Your Order</a>
        </div>

        <div class="footer">
            <p>Questions? Contact us at {{SUPPORT_EMAIL}}</p>
            <p>© {{YEAR}} {{COMPANY_NAME}}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`

const SHIPPING_NOTIFICATION_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Order Has Shipped - {{ORDER_NUMBER}}</title>
    <style>
        body {
            font-family: 'Helvetica', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .tracking {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .tracking h2 {
            color: #155724;
            margin-top: 0;
        }
        .tracking-number {
            font-size: 18px;
            font-weight: bold;
            font-family: monospace;
            background: white;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .cta {
            text-align: center;
            margin: 30px 0;
        }
        .cta a {
            background: #28a745;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Your Order Has Shipped! 📦</h1>
        </div>
        
        <p>Great news! Your order #{{ORDER_NUMBER}} has been shipped and is on its way to you.</p>

        <div class="tracking">
            <h2>Tracking Information</h2>
            <p>Tracking Number:</p>
            <div class="tracking-number">{{TRACKING_NUMBER}}</div>
            <p>Estimated Delivery: {{ESTIMATED_DELIVERY}}</p>
        </div>

        <div class="cta">
            <a href="{{TRACKING_URL}}">Track Your Package</a>
        </div>

        <p>You can also track your order using the tracking number above on our shipping partner's website.</p>

        <div class="footer">
            <p>Questions? Contact us at {{SUPPORT_EMAIL}}</p>
            <p>© {{YEAR}} {{COMPANY_NAME}}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`

export interface OrderData {
  id: string
  order_number: string
  status: string
  subtotal: number
  tax: number
  shipping: number
  total: number
  tracking_number?: string
  shipping_address: {
    firstName: string
    lastName: string
    email: string
    address: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  items: {
    quantity: number
    unit_price: number
    total_price: number
    product_snapshot: {
      title: string
      print_details: string
    }
  }[]
  created_at: string
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null

  /**
   * Initialize email transporter
   */
  private static getTransporter() {
    if (!isEmailEnabled()) {
      console.warn('Email is not enabled. Check SMTP configuration.')
      return null
    }

    if (this.transporter) {
      return this.transporter
    }

    this.transporter = nodemailer.createTransporter({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT || '587'),
      secure: env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })

    return this.transporter
  }

  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmation(orderData: OrderData): Promise<boolean> {
    try {
      const transporter = this.getTransporter()
      if (!transporter) {
        console.log('Email disabled - Order confirmation not sent')
        return false
      }

      // Format order items
      const itemsHtml = orderData.items.map(item => `
        <div class="item">
          <div class="item-name">${item.product_snapshot.title}</div>
          <div class="item-details">${item.product_snapshot.print_details} • Qty: ${item.quantity}</div>
          <div class="item-price">$${item.total_price.toFixed(2)}</div>
        </div>
      `).join('')

      // Format estimated delivery (7 days from order)
      const estimatedDelivery = new Date(new Date(orderData.created_at).getTime() + 7 * 24 * 60 * 60 * 1000)
        .toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })

      const orderDate = new Date(orderData.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      // Replace template variables
      let emailHtml = ORDER_CONFIRMATION_TEMPLATE
        .replace(/{{ORDER_NUMBER}}/g, orderData.order_number)
        .replace(/{{ORDER_DATE}}/g, orderDate)
        .replace(/{{ESTIMATED_DELIVERY}}/g, estimatedDelivery)
        .replace(/{{ITEMS}}/g, itemsHtml)
        .replace(/{{SUBTOTAL}}/g, orderData.subtotal.toFixed(2))
        .replace(/{{SHIPPING_DISPLAY}}/g, orderData.shipping === 0 ? 'FREE' : `$${orderData.shipping.toFixed(2)}`)
        .replace(/{{TAX}}/g, orderData.tax.toFixed(2))
        .replace(/{{TOTAL}}/g, orderData.total.toFixed(2))
        .replace(/{{CUSTOMER_NAME}}/g, `${orderData.shipping_address.firstName} ${orderData.shipping_address.lastName}`)
        .replace(/{{ADDRESS}}/g, orderData.shipping_address.address)
        .replace(/{{CITY}}/g, orderData.shipping_address.city)
        .replace(/{{STATE}}/g, orderData.shipping_address.state)
        .replace(/{{POSTAL_CODE}}/g, orderData.shipping_address.postalCode)
        .replace(/{{COUNTRY}}/g, orderData.shipping_address.country)
        .replace(/{{TRACKING_URL}}/g, `${env.NEXT_PUBLIC_APP_URL}/orders/${orderData.order_number}`)
        .replace(/{{SUPPORT_EMAIL}}/g, env.ADMIN_EMAIL)
        .replace(/{{YEAR}}/g, new Date().getFullYear().toString())
        .replace(/{{COMPANY_NAME}}/g, env.NEXT_PUBLIC_APP_NAME)

      // Send email
      await transporter.sendMail({
        from: `"${env.NEXT_PUBLIC_APP_NAME}" <${env.FROM_EMAIL}>`,
        to: orderData.shipping_address.email,
        subject: `Order Confirmation - ${orderData.order_number}`,
        html: emailHtml,
      })

      console.log(`Order confirmation email sent to ${orderData.shipping_address.email}`)
      return true

    } catch (error) {
      console.error('Failed to send order confirmation email:', error)
      return false
    }
  }

  /**
   * Send shipping notification email
   */
  static async sendShippingNotification(orderData: OrderData): Promise<boolean> {
    try {
      const transporter = this.getTransporter()
      if (!transporter) {
        console.log('Email disabled - Shipping notification not sent')
        return false
      }

      if (!orderData.tracking_number) {
        console.error('Cannot send shipping notification without tracking number')
        return false
      }

      // Format estimated delivery (3 business days from now)
      const estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })

      // Replace template variables
      let emailHtml = SHIPPING_NOTIFICATION_TEMPLATE
        .replace(/{{ORDER_NUMBER}}/g, orderData.order_number)
        .replace(/{{TRACKING_NUMBER}}/g, orderData.tracking_number)
        .replace(/{{ESTIMATED_DELIVERY}}/g, estimatedDelivery)
        .replace(/{{TRACKING_URL}}/g, `${env.NEXT_PUBLIC_APP_URL}/orders/${orderData.order_number}`)
        .replace(/{{SUPPORT_EMAIL}}/g, env.ADMIN_EMAIL)
        .replace(/{{YEAR}}/g, new Date().getFullYear().toString())
        .replace(/{{COMPANY_NAME}}/g, env.NEXT_PUBLIC_APP_NAME)

      // Send email
      await transporter.sendMail({
        from: `"${env.NEXT_PUBLIC_APP_NAME}" <${env.FROM_EMAIL}>`,
        to: orderData.shipping_address.email,
        subject: `Your Order Has Shipped - ${orderData.order_number}`,
        html: emailHtml,
      })

      console.log(`Shipping notification email sent to ${orderData.shipping_address.email}`)
      return true

    } catch (error) {
      console.error('Failed to send shipping notification email:', error)
      return false
    }
  }

  /**
   * Send admin notification for new orders
   */
  static async sendAdminOrderNotification(orderData: OrderData): Promise<boolean> {
    try {
      const transporter = this.getTransporter()
      if (!transporter) {
        return false
      }

      const itemsList = orderData.items.map(item => 
        `- ${item.product_snapshot.title} (${item.product_snapshot.print_details}) x${item.quantity} = $${item.total_price.toFixed(2)}`
      ).join('\n')

      const emailText = `
New Order Received: ${orderData.order_number}

Customer: ${orderData.shipping_address.firstName} ${orderData.shipping_address.lastName}
Email: ${orderData.shipping_address.email}
Total: $${orderData.total.toFixed(2)}

Items:
${itemsList}

Shipping Address:
${orderData.shipping_address.address}
${orderData.shipping_address.city}, ${orderData.shipping_address.state} ${orderData.shipping_address.postalCode}
${orderData.shipping_address.country}

Order Details: ${env.NEXT_PUBLIC_APP_URL}/admin/orders/${orderData.id}
      `

      await transporter.sendMail({
        from: `"${env.NEXT_PUBLIC_APP_NAME}" <${env.FROM_EMAIL}>`,
        to: env.ADMIN_EMAIL,
        subject: `New Order: ${orderData.order_number} - $${orderData.total.toFixed(2)}`,
        text: emailText,
      })

      console.log('Admin notification sent for new order')
      return true

    } catch (error) {
      console.error('Failed to send admin notification:', error)
      return false
    }
  }
}