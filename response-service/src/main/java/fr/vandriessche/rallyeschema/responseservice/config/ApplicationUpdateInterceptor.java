package fr.vandriessche.rallyeschema.responseservice.config;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import fr.vandriessche.rallyeschema.responseservice.services.ApplicationUpdatePublisher;

@Component
public class ApplicationUpdateInterceptor implements HandlerInterceptor {
    @Autowired
    private ApplicationUpdatePublisher publisher;

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
            Exception exception) {
        if (exception != null || response.getStatus() >= 400 || !isMutation(request.getMethod())) return;
        String path = request.getRequestURI();
        publisher.publish(domain(path), path, request.getMethod());
    }

    private boolean isMutation(String method) {
        return "POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method) || "DELETE".equals(method);
    }

    private String domain(String path) {
        if (path.contains("responseFileParam")) return "CONFIGURATION";
        if (path.contains("responseFile")) return "RESPONSE_FILES";
        if (path.contains("stageResult") || path.contains("stageResponse")) return "RESULTS";
        if (path.contains("teamInfo")) return "TEAMS";
        if (path.contains("stageParam") || path.contains("stageGroup") || path.contains("form-design")
                || path.contains("rallyParam") || path.equals("/rally") || path.equals("/api/rally")
                || path.contains("sharing/param")) return "CONFIGURATION";
        if (path.contains("database")) return "DATABASE";
        if (path.contains("logFile")) return "LOGS";
        return "APPLICATION";
    }
}
