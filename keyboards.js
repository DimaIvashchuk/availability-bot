export const jobOptions = {
  reply_markup: JSON.stringify({
      inline_keyboard: [
          [{text: '0%', callback_data: '0'}, {text: '10%', callback_data: '10'}, {text: '20%', callback_data: '20'}],
          [{text: '30%', callback_data: '30'}, {text: '40%', callback_data: '40'}, {text: '50%', callback_data: '50'}],
          [{text: '60%', callback_data: '60'}, {text: '70%', callback_data: '70'}, {text: '80%', callback_data: '80'}],
          [{text: '90%', callback_data: '90'}, {text: '100%', callback_data: '100'}],
      ]
  })
};

export const yesnoOptions = {
  reply_markup: JSON.stringify({
      inline_keyboard: [
          [{text: 'Так', callback_data: 'yes'}, {text: 'Ні', callback_data: 'no'}],
      ]
  })
}