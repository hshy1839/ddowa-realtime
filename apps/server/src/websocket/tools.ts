import { IAgentProvider, ToolResult } from '../providers/types';
import { Conversation, Booking, Contact } from '../models';

export async function executeToolCall(
  toolName: string,
  args: Record<string, any>,
  workspaceId: string,
  conversationId: string
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'getBusinessInfo': {
        // Return workspace business info from database
        return {
          toolCallId: `tool_${Date.now()}`,
          result: {
            companyName: 'Tohwa AI Consultation',
            phone: '+82-10-1234-5678',
            hours: 'Monday-Friday 9AM-6PM (KST)',
            website: 'https://tohwa.example.com',
            description: 'Professional AI-powered consultation service',
          },
        };
      }

      case 'listAvailability': {
        const date = args.date || new Date().toISOString().split('T')[0];
        // In production, query real availability from MongoDB
        // For now, return dynamic slots based on date
        const hours = ['09:00 AM', '10:00 AM', '10:30 AM', '11:00 AM', '02:00 PM', '02:30 PM', '03:00 PM', '04:00 PM'];
        return {
          toolCallId: `tool_${Date.now()}`,
          result: {
            date,
            availableSlots: hours.map(time => ({ time, duration: 30, timezone: 'KST' })),
          },
        };
      }

      case 'createBooking': {
        const { startTime, endTime, serviceName, customerName, customerEmail, customerPhone } = args;
        try {
          // Create booking in MongoDB
          const booking = await Booking.create({
            startAt: new Date(startTime),
            endAt: new Date(endTime),
            serviceName: serviceName || 'General Consultation',
            status: 'confirmed',
            contactId: null, // Will be linked to contact if provided
          });

          // Also save/update contact if provided
          if (customerEmail) {
            await Contact.findOneAndUpdate(
              { email: customerEmail },
              {
                name: customerName || 'Customer',
                phone: customerPhone,
                email: customerEmail,
                lastSeenAt: new Date(),
              },
              { upsert: true }
            );
          }

          return {
            toolCallId: `tool_${Date.now()}`,
            result: {
              success: true,
              bookingId: booking._id.toString(),
              startTime,
              endTime,
              serviceName,
              confirmationCode: `CONFIRM-${booking._id.toString().substring(0, 8).toUpperCase()}`,
              status: 'confirmed',
            },
          };
        } catch (error) {
          console.error('Booking creation error:', error);
          return {
            toolCallId: `tool_${Date.now()}`,
            result: {
              success: false,
              error: 'Failed to create booking',
            },
          };
        }
      }

      case 'getPaymentLink': {
        const { amount, bookingId } = args;
        // In production, use Stripe/PayPal API
        return {
          toolCallId: `tool_${Date.now()}`,
          result: {
            paymentUrl: `https://payment.example.com/checkout?amount=${amount || 99}&ref=${bookingId}`,
            amount: amount || 99,
            currency: 'USD',
            provider: 'stripe', // or 'paypal'
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        };
      }

      case 'updateBooking': {
        const { bookingId, status } = args;
        try {
          const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            { status },
            { new: true }
          );
          
          return {
            toolCallId: `tool_${Date.now()}`,
            result: {
              success: !!updatedBooking,
              bookingId,
              status,
              updatedAt: new Date().toISOString(),
            },
          };
        } catch (error) {
          console.error('Booking update error:', error);
          return {
            toolCallId: `tool_${Date.now()}`,
            result: {
              success: false,
              error: 'Failed to update booking',
            },
          };
        }
      }

      case 'cancelBooking': {
        const { bookingId } = args;
        try {
          const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            { status: 'cancelled' },
            { new: true }
          );
          
          return {
            toolCallId: `tool_${Date.now()}`,
            result: {
              success: !!updatedBooking,
              bookingId,
              message: 'Booking cancelled successfully',
              cancelledAt: new Date().toISOString(),
            },
          };
        } catch (error) {
          console.error('Booking cancellation error:', error);
          return {
            toolCallId: `tool_${Date.now()}`,
            result: {
              success: false,
              error: 'Failed to cancel booking',
            },
          };
        }
      }

      default: {
        return {
          toolCallId: `tool_${Date.now()}`,
          result: {
            error: `Unknown tool: ${toolName}`,
          },
        };
      }
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      toolCallId: `tool_${Date.now()}`,
      result: {
        error: `Failed to execute tool: ${toolName}`,
      },
    };
  }
}
