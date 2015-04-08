require 'highline/import'

task :configure_application do
  puts "Starting to configure the Streetmix Ruby on Rails web app."
  puts "Default values are listed between |pipe| characters. If you are O.K with that value, just press the Enter key."

  config = ask_for_config

  write_config_to_yml(config, Rails.root.join('config', 'application.yml'))
end

def ask_for_config
  config = {}

  config['port'] = ask('On which port do you want to run your local server? ') { |q| q.default = '3000' }
  config['api_path'] = '/api/'
  config['api_host'] = "localhost:#{config['port']}"

  config['database_username'] = ask('What is your root Postgres user name? (If you installed Postgres using Homebrew, this is your Mac OS user name)') { |q| q.default = Etc.getlogin }
  config['test_database'] = 'streetmix_test'

  no_internet_mode = ask('No-Internet Mode?') { |q| q.default = 'N' }
  if ['y', 'Y', 'yes'].include?(no_internet_mode)
    config['no_internet_mode'] = true
  else
    config['no_internet_mode'] = false
    puts "Now configuring Twitter OAuth credentials."
    puts "This is how your copy of Streetmix will authenticate users against Twitter."
    puts "To generate your own credentials, visit https://apps.twitter.com/"
    config['twitter_oauth_consumer_key'] = ask('What is your Twitter OAuth consumer key?')
    config['twitter_oauth_consumer_secret'] = ask('What is your Twitter OAuth consumer secret?')
  end

  config['secret_token'] = `rake secret`.chomp

  # not necessary for local development
  config['facebook_app_id'] = ''
  config['sauce_username'] = ''
  config['sauce_access_key'] = ''

  config
end

def write_config_to_yml(config, target_file)
  yaml = config.each { |k,v| config[k] = v.to_s }.to_yaml
  File.open(target_file, 'w') { |file| file.write(yaml) }
  puts "Configuration written to config/application.yml"
end
