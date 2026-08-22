package fr.vandriessche.rallyeschema.responseservice.models;

public class StageGroupModel {

    private String id;   // <-- IMPORTANT : String pour MongoDB
    private String name;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

}
