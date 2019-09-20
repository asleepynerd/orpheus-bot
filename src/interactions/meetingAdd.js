import { parseDate } from 'chrono-node'

import { recordMeeting, getInfoForUser, text as transcript } from '../utils'

const interactionMeetingAdd = (bot, message) => {
  getInfoForUser(message.user).then(({ club, history, slackUser }) => {
    if (message.text.indexOf(',') === -1) {
      // either the user typed "help" or an incorrectly formatted command
      bot.whisper(
        message,
        transcript('meetingAdd.help', { day: history.lastMeetingDay }),
        (err, response) => {
          if (err) {
            console.error(err)
          }
        }
      )
      return
    }

    const [rawDate, rawAttendance, ...other] = message.text.split(',')
    const date = parseDate(rawDate)
    const dayName = date.toLocaleDateString('en-us', {
      weekday: 'long',
      timeZone: slackUser.tz,
    })
    const mmddyyyy = date.toLocaleDateString('en-us', {
      timeZone: slackUser.tz,
    })
    const attendance = parseInt((rawAttendance.match(/(\d+)/) || [])[0])

    recordMeeting(
      club,
      { date: mmddyyyy, attendance },
      (err, meetingRecord) => {
        if (err) {
          console.error(err)
          bot.whisper(message, `Got error: \`${err}\``)
          return
        }

        bot.whisper(message, transcript('meetingAdd.success'))
      }
    )
    return

    bot.replyPrivate(
      message,
      {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Just to confirm, is the following correct?',
            },
          },
          {
            type: 'divider',
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Date: *${dayName} (${mmddyyyy})}*\nAttendance: *${attendance}*`,
            },
          },
          {
            type: 'divider',
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '✅ submit',
                  emoji: true,
                },
                value: 'true',
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '⛔️ cancel',
                  emoji: true,
                },
                value: 'false',
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'For help, type `/meeting-add help`',
              },
            ],
          },
        ],
      },
      [
        {
          pattern: 'true',
          callback: response => {
            recordMeeting(
              club,
              { date: date.mmddyyyy, attendance },
              (err, meetingRecord) => {
                if (err) {
                  bot.replyInteractive(
                    response,
                    `_⚠️ looks like something isn't working. All it says on my end is \`${err}\`._`
                  )
                } else {
                  bot.replyInteractive(
                    response,
                    `_✅ You confirm everything is accurate._`
                  )
                }
              }
            )
          },
        },
        {
          pattern: 'false',
          callback: response => {
            bot.replyInteractive(response, `_⛔️ You cancelled the command._`)
          },
        },
        {
          default: true,
          callback: response => {
            console.log('ignoring button')
          },
        },
      ]
    )
  })
}

export default interactionMeetingAdd
