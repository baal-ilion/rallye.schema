package fr.vandriessche.rallyeschema.responseservice.config;

import java.util.concurrent.Callable;

import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.aop.interceptor.SimpleAsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.async.CallableProcessingInterceptor;
import org.springframework.web.context.request.async.TimeoutCallableProcessingInterceptor;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import lombok.extern.java.Log;

@Configuration
@EnableAsync
@EnableScheduling
@Log
public class AsyncConfiguration implements AsyncConfigurer {

	@Bean
	public CallableProcessingInterceptor callableProcessingInterceptor() {
		return new TimeoutCallableProcessingInterceptor() {
			@Override
			public <T> Object handleTimeout(NativeWebRequest request, Callable<T> task) throws Exception {
				log.severe("timeout!");
				return super.handleTimeout(request, task);
			}
		};
	}

	@Override
	@Bean(name = "taskExecutor")
	public AsyncTaskExecutor getAsyncExecutor() {
		log.fine("Creating Async Task Executor");
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(5);
		executor.setMaxPoolSize(10);
		executor.setQueueCapacity(25);
		return executor;
	}

	@Override
	public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
		return new SimpleAsyncUncaughtExceptionHandler();
	}

	/** Configure async support for Spring MVC. */
	@Bean
	public WebMvcConfigurer webMvcConfigurerConfigurer(AsyncTaskExecutor taskExecutor,
			CallableProcessingInterceptor callableProcessingInterceptor) {
		return new WebMvcConfigurer() {
			@Override
			public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
				configurer.setDefaultTimeout(360000).setTaskExecutor(taskExecutor);
				configurer.registerCallableInterceptors(callableProcessingInterceptor);
				WebMvcConfigurer.super.configureAsyncSupport(configurer);
			}
		};
	}
}