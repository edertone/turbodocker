package com.edertone.turbodepot_api.config;

import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EntityScan("com.edertone.turbodepot_spring.model.rdb")
@EnableJpaRepositories("com.edertone.turbodepot_spring.repository")
public class JpaConfiguration {
}
