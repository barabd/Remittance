package com.frms.ops;

import com.frms.ops.config.FrmsOpsProperties;
import com.frms.ops.config.SecurityProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.mail.MailSenderAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(exclude = {MailSenderAutoConfiguration.class})
@EnableConfigurationProperties({FrmsOpsProperties.class, SecurityProperties.class})
public class FrmsOpsApplication {

  public static void main(String[] args) {
    SpringApplication.run(FrmsOpsApplication.class, args);
  }
}
